import { db } from "@/lib/db";
import { roundMoney } from "@/lib/affiliate-program";

export async function getAffiliatePaymentSummary(affiliateId?: string) {
  const [unpaid, payments] = await Promise.all([
    db.affiliateCommission.groupBy({ by: ["affiliateId"], where: { ...(affiliateId ? { affiliateId } : {}), status: { in: ["PENDING", "APPROVED", "LOCKED"] } }, _sum: { commissionAmount: true } }),
    db.affiliatePayoutItem.findMany({ where: { ...(affiliateId ? { affiliateId } : {}), status: "PAID" }, select: { affiliateId: true, paymentAmount: true, commissionOwed: true } }),
  ]);
  const outstanding = new Map(unpaid.map((row) => [row.affiliateId, roundMoney(row._sum.commissionAmount ?? 0)]));
  const paid = new Map<string, number>();
  for (const item of payments) paid.set(item.affiliateId, roundMoney((paid.get(item.affiliateId) ?? 0) + (item.paymentAmount ?? item.commissionOwed)));
  return { outstanding, paid, totalOutstanding: roundMoney([...outstanding.values()].reduce((sum, amount) => sum + amount, 0)), totalPaid: roundMoney([...paid.values()].reduce((sum, amount) => sum + amount, 0)) };
}
