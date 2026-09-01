import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ensureBulkOrderSchema } from "@/lib/bulk-orders";
import { db } from "@/lib/db";
import {
  buildBulkPurchaseInstructionsEmail,
  buildBulkPurchaseIntentAdminEmail,
  sendEmail,
} from "@/lib/emails";

const responseSchema = z.object({
  token: z.string().length(64),
  action: z.enum(["purchase", "opt-out"]),
});

function createPurchaseOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `OVI-BULK-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request) {
  const parsed = responseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "This decision link is invalid." }, { status: 400 });

  await ensureBulkOrderSchema();
  const bulkRequest = await db.bulkOrderRequest.findUnique({ where: { decisionToken: parsed.data.token } });
  if (!bulkRequest) return Response.json({ error: "This decision link is invalid or has been replaced by a newer quote." }, { status: 404 });
  if (bulkRequest.status === "PURCHASED") return Response.json({ error: "Payment has already been confirmed for this request." }, { status: 409 });

  if (parsed.data.action === "opt-out") {
    if (bulkRequest.status === "AWAITING_PAYMENT") {
      return Response.json({ error: "You have already selected Purchase Now. Please contact OVIpeps if you need to change your decision." }, { status: 409 });
    }
    await db.bulkOrderRequest.update({
      where: { id: bulkRequest.id },
      data: { status: "OPTED_OUT", paymentConfirmed: false, paymentConfirmedAt: null },
    });
    return Response.json({ status: "OPTED_OUT" });
  }

  if (bulkRequest.status === "OPTED_OUT") {
    return Response.json({ error: "This request has already been opted out. Please contact OVIpeps for assistance." }, { status: 409 });
  }
  if (!bulkRequest.quoteExpiresAt || bulkRequest.quoteExpiresAt.getTime() < Date.now()) {
    return Response.json({ error: "This 72-hour quote has expired. Please submit a new bulk order request." }, { status: 410 });
  }
  if (!bulkRequest.discountedPricing || !bulkRequest.eta) {
    return Response.json({ error: "This quote is incomplete. Please contact OVIpeps." }, { status: 409 });
  }

  const purchaseOrderNumber = bulkRequest.purchaseOrderNumber ?? createPurchaseOrderNumber();
  const updated = await db.bulkOrderRequest.update({
    where: { id: bulkRequest.id },
    data: {
      status: "AWAITING_PAYMENT",
      purchaseOrderNumber,
      purchaseIntentAt: bulkRequest.purchaseIntentAt ?? new Date(),
      paymentConfirmed: false,
      paymentConfirmedAt: null,
    },
  });
  const settings = await db.siteSetting.findMany({
    where: { key: { in: ["etransfer_email", "etransfer_instructions"] } },
  });
  const values = new Map(settings.map((setting) => [setting.key, setting.value]));
  const eTransferEmail = values.get("etransfer_email") ?? "ovipeps@gmail.com";
  const eTransferInstructions = values.get("etransfer_instructions") ?? "Send the exact quoted amount and include your purchase order number in the message field.";

  const [customerDelivery, adminDelivery] = await Promise.all([
    sendEmail(
      updated.email,
      buildBulkPurchaseInstructionsEmail({
        firstName: updated.firstName,
        purchaseOrderNumber,
        discountedPricing: updated.discountedPricing!,
        eta: updated.eta!,
        eTransferEmail,
        eTransferInstructions,
        quoteExpiresAt: updated.quoteExpiresAt!,
      }),
      { idempotencyKey: `bulk-purchase-customer-${updated.id}-${purchaseOrderNumber}` }
    ),
    sendEmail(
      "ovipeps@gmail.com",
      buildBulkPurchaseIntentAdminEmail({
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        purchaseOrderNumber,
        discountedPricing: updated.discountedPricing!,
        requestId: updated.id,
      }),
      { idempotencyKey: `bulk-purchase-admin-${updated.id}-${purchaseOrderNumber}` }
    ),
  ]);
  if (!customerDelivery.success || !adminDelivery.success) {
    console.error("Purchase decision recorded, but one or more emails failed", { id: updated.id, customerDelivery, adminDelivery });
    return Response.json({ status: "AWAITING_PAYMENT", purchaseOrderNumber, emailWarning: true });
  }
  return Response.json({ status: "AWAITING_PAYMENT", purchaseOrderNumber });
}
