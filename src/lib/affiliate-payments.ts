import type { Prisma } from "@/generated/prisma/client";
import { roundMoney } from "@/lib/affiliate-program";

export interface AffiliatePayment {
  paymentMethod: "E_TRANSFER" | "CRYPTO";
  paymentAmount: number;
  paidBy: string;
  paidAt: Date;
  paymentReference?: string;
}

/** Called inside a transaction; locks serialize retries and simultaneous payments. */
export async function recordAffiliatePayment(
  tx: Prisma.TransactionClient,
  payoutItemId: string,
  options: AffiliatePayment,
) {
  // Lock the monthly report first so two affiliates finishing the same report
  // cannot both leave its overall status incomplete.
  const initial = await tx.affiliatePayoutItem.findUnique({ where: { id: payoutItemId } });
  if (!initial) throw new Error("Payout item not found");
  await tx.$queryRaw`SELECT id FROM "AffiliatePayout" WHERE id = ${initial.payoutId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "AffiliateAccount" WHERE id = ${initial.affiliateId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "AffiliatePayoutItem" WHERE id = ${payoutItemId} FOR UPDATE`;
  const item = await tx.affiliatePayoutItem.findUnique({ where: { id: payoutItemId } });
  if (!item) throw new Error("Payout item not found");
  // A retry after a lost successful response must never pay or increment twice.
  if (item.status === "PAID") return item;
  if (!Number.isFinite(options.paymentAmount) || item.commissionOwed <= 0 ||
      Math.round(options.paymentAmount * 100) !== Math.round(item.commissionOwed * 100)) {
    throw new Error("Mark Paid requires the full commission amount in CAD. The outstanding balance has not been cleared.");
  }
  if (!options.paidBy.trim() || !Number.isFinite(options.paidAt.getTime()) ||
      options.paidAt.toISOString().slice(0, 10) > new Date().toISOString().slice(0, 10)) throw new Error("Enter who sent the payment and a valid payment date that is not in the future.");

  const commissionIds = Array.isArray(item.commissionIds)
    ? item.commissionIds.filter((id): id is string => typeof id === "string")
    : item.commissionId ? [item.commissionId] : [];
  if (!commissionIds.length) throw new Error("This payout has no linked commissions. Please review the monthly report before marking it paid.");
  const commissions = await tx.affiliateCommission.findMany({
    where: { id: { in: commissionIds }, affiliateId: item.affiliateId, status: "LOCKED" },
    select: { id: true, commissionAmount: true },
  });
  if (commissions.length !== new Set(commissionIds).size ||
      Math.round(roundMoney(commissions.reduce((sum, row) => sum + row.commissionAmount, 0)) * 100) !== Math.round(item.commissionOwed * 100)) {
    throw new Error("The linked commissions no longer match this payout. Review the report before recording payment.");
  }
  const updated = await tx.affiliatePayoutItem.update({
    where: { id: payoutItemId },
    data: { status: "PAID", paidAt: options.paidAt,
      paymentReference: options.paymentReference?.trim() || null,
      paymentMethod: options.paymentMethod, paymentAmount: roundMoney(options.paymentAmount),
      paidBy: options.paidBy.trim() },
  });
  await tx.affiliateCommission.updateMany({
    where: { id: { in: commissionIds }, affiliateId: item.affiliateId, status: "LOCKED" },
    data: { status: "PAID", paidAt: options.paidAt },
  });
  // Calculate from retained records, preserving newer/unpaid months and history.
  const [pending, paidItems] = await Promise.all([
    tx.affiliateCommission.aggregate({ where: { affiliateId: item.affiliateId, status: { in: ["PENDING", "APPROVED", "LOCKED"] } }, _sum: { commissionAmount: true } }),
    tx.affiliatePayoutItem.findMany({ where: { affiliateId: item.affiliateId, status: "PAID" }, select: { paymentAmount: true, commissionOwed: true } }),
  ]);
  await tx.affiliateAccount.update({
    where: { id: item.affiliateId },
    data: { pendingEarnings: roundMoney(pending._sum.commissionAmount ?? 0),
      paidEarnings: roundMoney(paidItems.reduce((sum, row) => sum + (row.paymentAmount ?? row.commissionOwed), 0)) },
  });
  const remaining = await tx.affiliatePayoutItem.count({ where: { payoutId: item.payoutId, status: { not: "PAID" }, commissionOwed: { gt: 0 } } });
  if (remaining === 0) await tx.affiliatePayout.update({
    where: { id: item.payoutId },
    data: { status: "PAID", processedAt: new Date(), processedBy: options.paidBy.trim() },
  });
  return updated;
}
