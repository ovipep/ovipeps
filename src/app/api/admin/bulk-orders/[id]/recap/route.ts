import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureBulkOrderSchema } from "@/lib/bulk-orders";
import { bulkPlanInputSchema } from "@/lib/bulk-checkout-schema";
import {
  prepareBulkRecap,
  approveAndSendBulkRecap,
  BulkCheckoutError,
} from "@/lib/bulk-checkout";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureBulkOrderSchema();
  const { id } = await params;
  const request = await db.bulkOrderRequest.findUnique({ where: { id } });
  if (!request)
    return Response.json({ error: "Request not found" }, { status: 404 });
  const [variants, orders] = await Promise.all([
    db.productVariant.findMany({
      where: { deletedAt: null },
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { sku: "asc" },
    }),
    db.order.findMany({
      where: {
        email: { equals: request.email, mode: "insensitive" },
        status: "AWAITING_PAYMENT",
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  return Response.json(
    { request, variants, orders },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
const commandSchema = z.discriminatedUnion("action", [
  bulkPlanInputSchema.extend({ action: z.literal("prepare") }),
  z.object({
    action: z.literal("approve_send"),
    version: z.string().regex(/^[a-f0-9]{32}$/),
  }),
]);
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const input = commandSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return Response.json(
      { error: input.error.issues[0]?.message ?? "Invalid draft details" },
      { status: 400 },
    );
  try {
    const result =
      input.data.action === "prepare"
        ? await prepareBulkRecap(id, input.data, session.user.id)
        : await approveAndSendBulkRecap(
            id,
            input.data.version,
            session.user.id,
          );
    return Response.json({ request: result });
  } catch (error) {
    console.error(
      "Bulk recap operation failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      {
        error:
          error instanceof BulkCheckoutError
            ? error.message
            : "Unable to complete this operation. The draft remains available for review.",
      },
      { status: error instanceof BulkCheckoutError ? error.status : 503 },
    );
  }
}
