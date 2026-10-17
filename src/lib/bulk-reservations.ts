import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
/** Reserve backordered units oldest-first after stock is entered. Never send customer email here. */
export async function reserveBackorders(variantId: string, addedUnits: number, preserveStock = 0) {
  if (addedUnits <= 0) return 0;
  return db.$transaction(tx => reserveBackordersInTransaction(tx, variantId, addedUnits, preserveStock), { maxWait: 10000, timeout: 20000 });
}
export async function reserveBackordersInTransaction(tx: Prisma.TransactionClient, variantId: string, addedUnits: number, preserveStock: number) {
  if (addedUnits <= 0) return 0;
  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) return 0;
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${variant.productId} FOR UPDATE`;
  const lines = await tx.orderItem.findMany({
    where: {
      variantId,
      reservedQuantity: { not: null },
      order: {
        status: {
          in: ["AWAITING_PAYMENT", "PAYMENT_RECEIVED", "PROCESSING"],
        },
      },
    },
    include: {
      order: { select: { id: true, createdAt: true, status: true } },
    },
    orderBy: { order: { createdAt: "asc" } },
  });
  let total = 0;
  for (const line of lines) {
    if ((line.reservedQuantity ?? line.quantity) >= line.quantity) continue;
    if (
      line.order.status === "AWAITING_PAYMENT" &&
      line.order.createdAt.getTime() < Date.now() - 72 * 3600000
    )
      continue;
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${line.order.id} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: line.order.id },
      select: { status: true },
    });
    if (
      !order ||
      !["AWAITING_PAYMENT", "PAYMENT_RECEIVED", "PROCESSING"].includes(
        order.status,
      )
    )
      continue;
    const current = await tx.orderItem.findUnique({
      where: { id: line.id },
    });
    if (!current) continue;
    const stock = await tx.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    const take = Math.min(
      Math.max(0, stock.stockQuantity - preserveStock),
      Math.max(0, addedUnits - total),
      current.quantity - (current.reservedQuantity ?? current.quantity),
    );
    if (take <= 0) continue;
    const changed = await tx.productVariant.updateMany({
      where: { id: variantId, stockQuantity: { gte: take } },
      data: { stockQuantity: { decrement: take } },
    });
    if (changed.count !== 1) continue;
    await tx.orderItem.update({
      where: { id: current.id },
      data: { reservedQuantity: { increment: take } },
    });
    total += take;
  }
  const stock = await tx.productVariant.findUniqueOrThrow({
    where: { id: variantId },
  });
  await tx.productVariant.update({
    where: { id: variantId },
    data: { inStock: stock.stockQuantity > 0 },
  });
  return total;
}
