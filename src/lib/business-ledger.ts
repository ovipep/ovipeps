import { db } from "@/lib/db";

export const PAID_ORDER_STATUSES = ["PAYMENT_RECEIVED", "PROCESSING", "SHIPPED", "COMPLETED"] as const;

export async function getBusinessLedger(from: Date, to: Date) {
  const [orders, manualEntries, variants] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: { in: [...PAID_ORDER_STATUSES] } },
      include: { items: true }, orderBy: { createdAt: "desc" },
    }),
    db.ledgerEntry.findMany({ where: { transactionAt: { gte: from, lte: to } }, orderBy: { transactionAt: "desc" } }),
    db.productVariant.findMany({ include: { product: { select: { name: true } } }, orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }] }),
  ]);
  const orderRows = orders.map((order) => ({
    id: `order-${order.id}`, date: order.paidAt ?? order.createdAt, type: "INCOME",
    category: "Product sales",
    description: `${order.orderNumber}: ${order.items.map((item) => `${item.productName} ${item.variantName} × ${item.quantity}`).join(", ")}`,
    merchandise: order.subtotal - order.discountAmount, shipping: order.shippingAmount,
    tax: order.taxAmount, expense: 0, total: order.total, reference: order.orderNumber,
    paymentMethod: order.paymentMethod.replaceAll("_", " "), notes: order.notes ?? "",
    currency: "CAD", foreignAmount: order.total, fxRate: 1, fxRateDate: order.paidAt ?? order.createdAt,
  }));
  const manualRows = manualEntries.map((entry) => ({
    id: `manual-${entry.id}`, date: entry.transactionAt, type: entry.entryType,
    category: entry.category, description: entry.description,
    merchandise: entry.entryType === "INCOME" ? entry.amount : 0,
    shipping: entry.entryType === "INCOME" ? entry.shippingAmount : 0, tax: entry.taxAmount,
    expense: entry.entryType === "EXPENSE" ? entry.amount + entry.shippingAmount + entry.taxAmount : 0,
    total: entry.entryType === "INCOME" ? entry.amount + entry.shippingAmount + entry.taxAmount : -(entry.amount + entry.shippingAmount + entry.taxAmount),
    reference: entry.reference ?? "", paymentMethod: entry.paymentMethod ?? "", notes: entry.notes ?? "",
    currency: entry.currency, foreignAmount: entry.foreignAmount ?? entry.amount,
    fxRate: entry.fxRate ?? 1, fxRateDate: entry.fxRateDate ?? entry.transactionAt,
  }));
  return { rows: [...orderRows, ...manualRows].sort((a, b) => b.date.getTime() - a.date.getTime()), variants };
}
