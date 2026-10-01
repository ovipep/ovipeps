import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export class OrderShippingError extends Error {
  constructor(message: string, public readonly status = 409) {
    super(message);
  }
}

export async function updateShipment(
  tx: Prisma.TransactionClient,
  orderId: string,
  trackingNumber: string | undefined,
  markShipped: boolean,
) {
  if (trackingNumber !== undefined && trackingNumber.trim().length > 100) {
    throw new OrderShippingError("Tracking number must be 100 characters or fewer", 400);
  }
  // Serialize updates, including retries after a committed but lost response.
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderShippingError("Order not found", 404);
  const pending = order.status === "PROCESSING" || order.status === "PAYMENT_RECEIVED";
  const shipped = order.status === "SHIPPED" || order.status === "COMPLETED";
  if (!pending && !shipped) {
    throw new OrderShippingError("Confirm payment before saving tracking or marking the order as shipped.");
  }
  // Omitted tracking preserves it; an explicit blank clears it.
  const savedTrackingNumber = trackingNumber === undefined
    ? order.trackingNumber
    : trackingNumber.trim() || null;
  const now = new Date();
  const updated = await tx.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: savedTrackingNumber,
      ...(markShipped ? {
        status: "COMPLETED" as const,
        shippedAt: order.shippedAt ?? now,
        completedAt: order.completedAt ?? now,
      } : {}),
    },
  });
  if (markShipped && pending) {
    await tx.shipment.create({
      data: { orderId, status: "shipped", shippedAt: updated.shippedAt, trackingNumber: savedTrackingNumber },
    });
  } else if (shipped && trackingNumber !== undefined) {
    await tx.shipment.updateMany({
      where: { orderId },
      data: { trackingNumber: savedTrackingNumber },
    });
  }
  return updated;
}

export async function completeShipment(orderId: string, trackingNumber?: string) {
  return db.$transaction(
    (tx) => updateShipment(tx, orderId, trackingNumber, true),
    { maxWait: 10_000, timeout: 15_000 },
  );
}

export async function saveOrderTracking(orderId: string, trackingNumber: string) {
  return db.$transaction(
    (tx) => updateShipment(tx, orderId, trackingNumber, false),
    { maxWait: 10_000, timeout: 15_000 },
  );
}
