import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ensureBulkOrderSchema, isBulkOrderStatus, parseBulkOrderItems } from "@/lib/bulk-orders";
import { db } from "@/lib/db";
import { buildBulkOrderDecisionEmail, sendEmail } from "@/lib/emails";

const updateSchema = z.object({
  adminDecision: z.string().trim().max(5000).optional(),
  discountedPricing: z.string().trim().max(5000).optional(),
  eta: z.string().trim().max(500).optional(),
  status: z.string().optional(),
  confirmPaymentReceived: z.boolean().optional(),
  sendCustomerUpdate: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext<"/api/admin/bulk-orders/[id]">) {
  if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request update." }, { status: 400 });
  if (parsed.data.status && !isBulkOrderStatus(parsed.data.status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }
  if (parsed.data.status === "PURCHASED" && parsed.data.confirmPaymentReceived !== true) {
    return Response.json({ error: "Payment must be explicitly confirmed before marking this request Purchased." }, { status: 400 });
  }
  if (parsed.data.sendCustomerUpdate && (!parsed.data.discountedPricing || !parsed.data.eta)) {
    return Response.json({ error: "Discounted pricing and ETA are required before emailing the customer." }, { status: 400 });
  }

  await ensureBulkOrderSchema();
  const existing = await db.bulkOrderRequest.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Request not found." }, { status: 404 });

  const status = parsed.data.status ?? existing.status;
  let updated = await db.bulkOrderRequest.update({
    where: { id },
    data: {
      adminDecision: parsed.data.adminDecision ?? existing.adminDecision,
      discountedPricing: parsed.data.discountedPricing ?? existing.discountedPricing,
      eta: parsed.data.eta ?? existing.eta,
      status,
      paymentConfirmed: status === "PURCHASED" ? true : false,
      paymentConfirmedAt: status === "PURCHASED" ? new Date() : null,
    },
  });

  if (parsed.data.sendCustomerUpdate) {
    const delivery = await sendEmail(
      updated.email,
      buildBulkOrderDecisionEmail({
        firstName: updated.firstName,
        requestId: updated.id,
        discountedPricing: updated.discountedPricing!,
        eta: updated.eta!,
        adminDecision: updated.adminDecision,
        items: parseBulkOrderItems(updated.items),
      }),
      { idempotencyKey: `bulk-decision-${updated.id}-${updated.updatedAt.getTime()}` }
    );
    if (!delivery.success) {
      return Response.json({ error: "The decision was saved, but the customer email could not be sent.", saved: true }, { status: 502 });
    }
    updated = await db.bulkOrderRequest.update({
      where: { id },
      data: { customerDecisionSentAt: new Date() },
    });
  }

  return Response.json({ request: updated });
}
