import { getAffiliatePaymentSummary } from "@/lib/affiliate-payment-summary";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { reconcileAllAffiliateMinimums } from "@/lib/affiliate";
import { AFFILIATE_CUSTOMER_DISCOUNT_RATE } from "@/lib/affiliate-program";

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await reconcileAllAffiliateMinimums();
  const [performance, payouts] = await Promise.all([
    db.affiliateMonthlyPerformance.findMany({
      orderBy: [
        { periodYear: "asc" },
        { periodMonth: "asc" },
      ],
      include: {
        affiliate: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    }),
    db.affiliatePayout.findMany({
      include: { items: { include: { affiliate: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } } } },
    }),
  ]);

  const payoutItems = new Map(
    payouts.flatMap((payout) =>
      payout.items.map((item) => [
        `${payout.periodYear}-${payout.periodMonth}-${item.affiliateId}`,
        item,
      ] as const)
    )
  );

  const summary = await getAffiliatePaymentSummary();
  // Include paid reports even if an affiliate's first partial month had no
  // minimum-performance record. Payment history must never disappear on export.
  const recordedPeriods = new Set(performance.map((record) => `${record.periodYear}-${record.periodMonth}-${record.affiliateId}`));
  const reportRecords = [...performance];
  for (const payout of payouts) for (const item of payout.items) {
    if (!recordedPeriods.has(`${payout.periodYear}-${payout.periodMonth}-${item.affiliateId}`)) {
      reportRecords.push({ id: item.id, affiliateId: item.affiliateId,
        periodYear: payout.periodYear, periodMonth: payout.periodMonth,
        qualifyingSales: item.grossSales, commissionRate: item.commissionRate,
        commissionOwed: item.commissionOwed, minimumMet: item.grossSales >= 300,
        missedMinimumCount: item.affiliate.missedMinimumMonths,
        evaluatedAt: item.createdAt, createdAt: item.createdAt, updatedAt: item.updatedAt,
        affiliate: item.affiliate });
    }
  }
  reportRecords.sort((a, b) => a.periodYear - b.periodYear || a.periodMonth - b.periodMonth);
  const header = [
    "Month",
    "Year",
    "Affiliate",
    "Email",
    "Affiliate Code",
    "Qualifying Sales Before Shipping (CAD)",
    "Customer Discount (%)",
    "Commission Rate (%)",
    "Commission Owed (CAD)",
    "$300 Minimum Met",
    "Missed Minimum Months",
    "Account Status",
    "Amount Sent (CAD)",
    "Payout Status",
    "Date Paid",
    "Payment Method",
    "Payment Reference",
    "Sent By",
    "Remaining for Period (CAD)",
    "Affiliate Total Paid All Time (CAD)",
    "All Affiliate Payouts All Time (CAD)",
  ];
  const rows = reportRecords.map((record) => {
    const item = payoutItems.get(
      `${record.periodYear}-${record.periodMonth}-${record.affiliateId}`
    );
    return [
      new Intl.DateTimeFormat("en-CA", { month: "long" }).format(
        new Date(record.periodYear, record.periodMonth - 1, 1)
      ),
      record.periodYear,
      [record.affiliate.user.firstName, record.affiliate.user.lastName]
        .filter(Boolean)
        .join(" "),
      record.affiliate.user.email,
      record.affiliate.code.startsWith("PENDING-") ? "" : record.affiliate.code,
      record.qualifyingSales.toFixed(2),
      AFFILIATE_CUSTOMER_DISCOUNT_RATE.toFixed(2),
      record.commissionRate.toFixed(2),
      record.commissionOwed.toFixed(2),
      record.minimumMet ? "Yes" : "No",
      record.missedMinimumCount,
      record.affiliate.status === "SUSPENDED"
        ? "FROZEN"
        : record.affiliate.status === "INACTIVE"
          ? "TERMINATED"
          : record.affiliate.status,
      item?.paymentAmount?.toFixed(2) ?? "",
      item?.status ?? "NO PAYOUT",
      item?.paidAt?.toISOString().slice(0, 10) ?? "",
      item?.paymentMethod === "E_TRANSFER"
        ? "e-Transfer"
        : item?.paymentMethod === "CRYPTO"
          ? "Crypto"
          : "",
      item?.paymentReference ?? "",
      item?.paidBy ?? "",
      (item?.status === "PAID" ? 0 : item?.commissionOwed ?? record.commissionOwed).toFixed(2),
      (summary.paid.get(record.affiliateId) ?? 0).toFixed(2),
      summary.totalPaid.toFixed(2),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ovipeps-affiliate-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
