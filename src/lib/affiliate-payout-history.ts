import { roundMoney } from "@/lib/affiliate-program";

type PayoutRecord = {
  id: string;
  payout: { periodMonth: number; periodYear: number };
  grossSales: number;
  commissionOwed: number;
  paymentAmount: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
};

export function buildAffiliatePayoutHistory(records: PayoutRecord[]) {
  const runningTotals = new Map<string, number>();
  const paid = records.filter((row) => row.status === "PAID").sort((a, b) =>
    (a.paidAt ?? a.createdAt).getTime() - (b.paidAt ?? b.createdAt).getTime() ||
    a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
  );
  let total = 0;
  for (const row of paid) {
    total = roundMoney(total + (row.paymentAmount ?? row.commissionOwed));
    runningTotals.set(row.id, total);
  }
  return records.map((row) => ({
    id: row.id, periodMonth: row.payout.periodMonth, periodYear: row.payout.periodYear,
    grossSales: row.grossSales, commissionOwed: row.commissionOwed,
    paymentAmount: row.paymentAmount, paymentMethod: row.paymentMethod,
    paymentReference: row.paymentReference, status: row.status,
    paidAt: row.paidAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(),
    runningPaidTotal: runningTotals.get(row.id) ?? null,
  }));
}
