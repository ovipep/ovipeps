import { getAffiliatePaymentSummary } from "@/lib/affiliate-payment-summary";
import { GeneratePayoutForm, MarkPayoutPaidButton } from "@/components/admin/payout-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminAffiliatePayoutsPage() {
  const [summary, affiliates] = await Promise.all([
    getAffiliatePaymentSummary(),
    db.affiliateAccount.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: "asc" } }),
  ]);
  const payouts = await db.affiliatePayout.findMany({
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    include: {
      items: {
        include: {
          affiliate: {
            include: {
              user: { select: { email: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Affiliate Payouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate completed-month tier reports, review $300 minimums, and record manual payments.</p>
        </div>
        <Link href="/api/admin/affiliates/payouts/export"><Button variant="outline">Download ongoing CSV ledger</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Outstanding affiliate commissions</p><p className="text-2xl font-semibold">{formatCurrency(summary.totalOutstanding)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total paid out — all time</p><p className="text-2xl font-semibold">{formatCurrency(summary.totalPaid)}</p></CardContent></Card>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-4">Affiliate</th><th className="p-4">Outstanding commission</th><th className="p-4">Paid out — all time</th></tr></thead><tbody>
          {affiliates.map((affiliate) => <tr id={`affiliate-${affiliate.id}`} key={affiliate.id} className="border-b"><td className="p-4">{affiliate.user.firstName} {affiliate.user.lastName}<p className="text-sm text-muted-foreground">{affiliate.user.email}</p></td><td className="p-4 tabular-nums">{formatCurrency(summary.outstanding.get(affiliate.id) ?? 0)}</td><td className="p-4 tabular-nums">{formatCurrency(summary.paid.get(affiliate.id) ?? 0)}</td></tr>)}
          {!affiliates.length && <tr><td colSpan={3} className="p-4">No affiliate accounts yet.</td></tr>}
        </tbody></table>
      </div>
      <p className="text-sm text-muted-foreground">Generate a report for a completed month, then select Paid beside each affiliate after sending the full payment. Payments are recorded as Business Ledger expenses automatically; do not add them again as manual expenses.</p>
      <Card>
        <CardHeader>
          <CardTitle>Generate Monthly Report</CardTitle>
        </CardHeader>
        <CardContent>
          <GeneratePayoutForm />
        </CardContent>
      </Card>

      {payouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payout reports yet.</p>
      ) : (
        <div className="space-y-6">
          {payouts.map((payout) => (
            <Card key={payout.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {payout.periodMonth}/{payout.periodYear}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Commission earned: {formatCurrency(payout.totalAmount)} · Still owed: {formatCurrency(payout.items.reduce((sum, item) => sum + (item.status === "PAID" ? 0 : item.commissionOwed), 0))}
                  </p>
                </div>
                <Badge
                  variant={
                    payout.status === "PAID" ? "success" : "default"
                  }
                >
                  {payout.status}
                </Badge>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Affiliate</th>
                      <th className="pb-3 pr-4 font-medium">Gross Sales</th>
                      <th className="pb-3 pr-4 font-medium">Rate</th>
                      <th className="pb-3 pr-4 font-medium">Still owed</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Payment record</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payout.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/60">
                        <td className="py-3 pr-4">
                          <p className="font-medium">
                            {item.affiliate.user.firstName}{" "}
                            {item.affiliate.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.affiliate.user.email}
                          </p>
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {formatCurrency(item.grossSales)}
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {item.commissionRate}%
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {formatCurrency(item.status === "PAID" ? 0 : item.commissionOwed)}
                          <p className="text-xs text-muted-foreground">Earned: {formatCurrency(item.commissionOwed)}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              item.status === "PAID" ? "success" : "default"
                            }
                          >
                            {item.status}
                          </Badge>
                          {item.paidAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(item.paidAt)}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {item.status === "PAID" ? (
                            <div className="space-y-1">
                              <p>{item.paymentMethod === "E_TRANSFER" ? "e-Transfer" : "Crypto"}</p>
                              <p>{formatCurrency(item.paymentAmount ?? item.commissionOwed)} sent</p>
                              <p>By {item.paidBy ?? "—"}</p>
                              {item.paymentReference ? <p>Ref: {item.paymentReference}</p> : null}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="py-3">
                          {item.status !== "PAID" && item.commissionOwed > 0 && (
                            <MarkPayoutPaidButton payoutItemId={item.id} amount={item.commissionOwed} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
