import { z } from "zod";
import { randomBytes } from "node:crypto";
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
  if (
    (parsed.data.status === "PURCHASED" || parsed.data.status === "PENDING_SHIPMENT") &&
    parsed.data.confirmPaymentReceived !== true
  ) {
    return Response.json({ error: "Payment must be explicitly confirmed before moving this request to Pending Shipment." }, { status: 400 });
  }
  if (parsed.data.sendCustomerUpdate && (!parsed.data.discountedPricing || !parsed.data.eta)) {
    return Response.json({ error: "Discounted pricing and ETA are required before emailing the customer." }, { status: 400 });
  }

  await ensureBulkOrderSchema();
  const existing = await db.bulkOrderRequest.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Request not found." }, { status: 404 });

  if (
    parsed.data.status === "PENDING_SHIPMENT" &&
    existing.status !== "AWAITING_PAYMENT" &&
    existing.status !== "PURCHASED"
  ) {
    return Response.json({ error: "Payment Received can only be selected for a request that is awaiting e-transfer." }, { status: 409 });
  }
  if (parsed.data.status === "COMPLETE" && existing.status !== "PENDING_SHIPMENT") {
    return Response.json({ error: "Shipped can only be selected after payment has been received." }, { status: 409 });
  }
  if (
    parsed.data.status === "OPTED_OUT" &&
    ["PENDING_SHIPMENT", "COMPLETE", "PURCHASED"].includes(existing.status)
  ) {
    return Response.json({ error: "A paid or completed request cannot be opted out." }, { status: 409 });
  }

  const status = parsed.data.status ?? existing.status;
  const quoteIssuedAt = parsed.data.sendCustomerUpdate ? new Date() : existing.quoteIssuedAt;
  const quoteExpiresAt = parsed.data.sendCustomerUpdate
    ? new Date(quoteIssuedAt!.getTime() + 72 * 60 * 60 * 1000)
    : existing.quoteExpiresAt;
  const decisionToken = parsed.data.sendCustomerUpdate
    ? randomBytes(32).toString("hex")
    : existing.decisionToken;
  const paymentIsConfirmed = ["PENDING_SHIPMENT", "COMPLETE", "PURCHASED"].includes(status);
  let updated = await db.bulkOrderRequest.update({
    where: { id },
    data: {
      adminDecision: parsed.data.adminDecision ?? existing.adminDecision,
      discountedPricing: parsed.data.discountedPricing ?? existing.discountedPricing,
      eta: parsed.data.eta ?? existing.eta,
      status,
      paymentConfirmed: paymentIsConfirmed,
      paymentConfirmedAt: paymentIsConfirmed
        ? existing.paymentConfirmedAt ?? new Date()
        : null,
      decisionToken,
      quoteIssuedAt,
      quoteExpiresAt,
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
        decisionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"}/bulk-order-response/${updated.decisionToken}`,
        quoteExpiresAt: updated.quoteExpiresAt!,
      }),
      { idempotencyKey: `bulk-decision-${updated.id}-${updated.decisionToken}` }
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
