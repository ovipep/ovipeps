import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ensureBulkOrderSchema } from "@/lib/bulk-orders";
import { db } from "@/lib/db";
const responseSchema = z.object({
  token: z.string().length(64),
  action: z.enum(["purchase", "opt-out"]),
  customerReply: z.string().trim().max(5000).optional(),
});
export async function POST(request: Request) {
  const parsed = responseSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "This decision link or reply is invalid." },
      { status: 400 },
    );
  await ensureBulkOrderSchema();
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "BulkOrderRequest" WHERE "decisionToken"=${parsed.data.token} FOR UPDATE`;
      const current = await tx.bulkOrderRequest.findUnique({
        where: { decisionToken: parsed.data.token },
      });
      if (!current)
        return {
          error: "This decision link is invalid or has been replaced.",
          code: 404,
        };
      if (current.status !== "PENDING_DECISION")
        return {
          error:
            "Your decision has already been recorded. Contact OVIpeps to make a change.",
          code: 409,
        };
      if (
        !current.quoteExpiresAt ||
        current.quoteExpiresAt.getTime() < Date.now()
      )
        return {
          error:
            "This quote has expired. Contact OVIpeps for an updated quote.",
          code: 410,
        };
      const purchase = parsed.data.action === "purchase";
      const updated = await tx.bulkOrderRequest.update({
        where: { id: current.id },
        data: {
          status: purchase ? "PENDING_REVIEW" : "OPTED_OUT",
          customerReply: parsed.data.customerReply || null,
          purchaseIntentAt: purchase ? new Date() : null,
          purchaseOrderNumber: purchase
            ? (current.purchaseOrderNumber ??
              `OVI-BULK-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`)
            : current.purchaseOrderNumber,
        },
      });
      return { status: updated.status };
    });
    if ("error" in result)
      return Response.json({ error: result.error }, { status: result.code });
    // Deliberately no customer send: the recap must be reviewed and explicitly approved.
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Unable to record your decision. Please try again." },
      { status: 503 },
    );
  }
}
