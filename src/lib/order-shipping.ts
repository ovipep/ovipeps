import { db } from "@/lib/db";

export async function completeShipment(orderId: string) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({ where: { id: orderId, status: { in: ["PROCESSING", "PAYMENT_RECEIVED"] } }, data: { status: "COMPLETED", shippedAt: now, completedAt: now } });
    if (updated.count !== 1) {
      const exists = await tx.order.findUnique({ where: { id: orderId }, select: { id: true } });
      throw new Error(exists ? "Only orders pending shipping can be marked as shipped" : "Order not found");
    }
    await tx.shipment.create({ data: { orderId, status: "shipped", shippedAt: now } });
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, payments: true, shipments: true } });
  });
}
