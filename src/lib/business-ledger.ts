import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const PAID_ORDER_STATUSES = ["PAYMENT_RECEIVED", "PROCESSING", "SHIPPED", "COMPLETED"] as const;

export async function getBusinessLedger(from: Date, to: Date) {
  const [orders, manualEntries, variants, affiliatePayments] = await Promise.all([
    db.order.findMany({
      where: {
        status: { in: [...PAID_ORDER_STATUSES] },
        OR: [
          { paidAt: { gte: from, lte: to } },
          { paidAt: null, createdAt: { gte: from, lte: to } },
        ],
      },
      include: { items: true }, orderBy: { createdAt: "desc" },
    }),
    db.ledgerEntry.findMany({ where: { transactionAt: { gte: from, lte: to } }, orderBy: { transactionAt: "desc" } }),
    db.productVariant.findMany({ include: { product: { select: { name: true } } }, orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }] }),
    db.affiliatePayoutItem.findMany({
      where: { status: "PAID", paidAt: { gte: from, lte: to } },
      include: { payout: true, affiliate: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
      orderBy: { paidAt: "desc" },
    }),
  ]);
  const orderRows = orders.map((order) => ({
    id: `order-${order.id}`, date: order.paidAt ?? order.createdAt, type: "INCOME",
    category: "Product sales",
    description: `${order.orderNumber}: ${order.items.map((item) => `${item.productName} ${item.variantName} × ${item.quantity}`).join(", ")}`,
    merchandise: order.subtotal - order.discountAmount, shipping: order.shippingAmount,
    tax: order.taxAmount, expense: 0, total: order.total, reference: order.orderNumber,
    paymentMethod: order.paymentMethod.replaceAll("_", " "), notes: order.notes ?? "",
    currency: "CAD", foreignAmount: order.total, fxRate: 1, fxRateDate: order.paidAt ?? order.createdAt,
    manualId: null,
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
    manualId: entry.id,
  }));
  const affiliateRows = affiliatePayments.map(affiliatePayoutLedgerRow);
  return { rows: [...orderRows, ...manualRows, ...affiliateRows].sort((a, b) => b.date.getTime() - a.date.getTime()), variants };
}

type LedgerPayout = Prisma.AffiliatePayoutItemGetPayload<{ include: { payout: true; affiliate: { include: { user: { select: { firstName: true; lastName: true; email: true } } } } } }>;

export function affiliatePayoutLedgerRow(item: LedgerPayout) {
    const amount = item.paymentAmount ?? item.commissionOwed;
    const date = item.paidAt!;
    const user = item.affiliate.user;
    return {
      id: `affiliate-payout-${item.id}`, date, type: "EXPENSE",
      category: "Affiliate commissions",
      description: `${user.firstName ?? ""} ${user.lastName ?? ""} (${user.email}) — ${item.payout.periodMonth}/${item.payout.periodYear} commission payout`,
      merchandise: 0, shipping: 0, tax: 0, expense: amount, total: -amount,
      reference: item.paymentReference ?? item.id,
      paymentMethod: item.paymentMethod === "E_TRANSFER" ? "e-Transfer" : item.paymentMethod === "CRYPTO" ? "Crypto" : "",
      notes: `Sent by: ${item.paidBy ?? "—"}. ${item.notes ?? ""}`,
      currency: "CAD", foreignAmount: amount, fxRate: 1, fxRateDate: date, manualId: null,
    };
}
