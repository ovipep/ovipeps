import { db } from "@/lib/db";

export async function completeShipment(
  orderId: string,
  trackingNumber?: string
) {
  const now = new Date();
  const savedTrackingNumber = trackingNumber?.trim() || null;

  return db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: orderId,
        status: { in: ["PROCESSING", "PAYMENT_RECEIVED"] },
      },
      data: {
        status: "COMPLETED",
        shippedAt: now,
        completedAt: now,
        trackingNumber: savedTrackingNumber,
      },
    });

    if (updated.count !== 1) {
      const exists = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      });
      throw new Error(
        exists
          ? "Only orders pending shipping can be marked as shipped"
          : "Order not found"
      );
    }

    await tx.shipment.create({
      data: {
        orderId,
        status: "shipped",
        shippedAt: now,
        trackingNumber: savedTrackingNumber,
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, payments: true, shipments: true },
    });
  });
}
