"use client";

import { PayoutEmailForm } from "@/components/affiliates/payout-email-form";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Check,
  Copy,
  DollarSign,
  LockKeyhole,
  MousePointerClick,
  Percent,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  COMMISSION_STATUS_LABELS,
  type AffiliateDashboardData,
} from "@/lib/affiliate-types";
import { AffiliateCodeSetup } from "@/components/affiliates/code-setup";
import { SITE_URL } from "@/lib/content";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { CommissionStatus } from "@/generated/prisma/enums";

interface AffiliateDashboardProps {
  data: AffiliateDashboardData;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex gap-2">
        <code className="flex-1 truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function commissionBadgeVariant(status: CommissionStatus) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "APPROVED":
      return "research" as const;
    case "PENDING":
      return "warning" as const;
    case "REVERSED":
      return "default" as const;
    default:
      return "default" as const;
  }
}

function formatChartDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function DataTable({
  title,
  description,
  columns,
  rows,
  emptyMessage,
}: {
  title: string;
  description?: string;
  columns: { key: string; label: string; className?: string }[];
  rows: Record<string, ReactNode>[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-6 py-3 font-medium text-muted-foreground",
                      col.className
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-border/60 last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-6 py-3", col.className)}>
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export function AffiliateDashboard({ data }: AffiliateDashboardProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 5000) return;
      lastRefresh = Date.now();
      startRefresh(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  const latestPayoutDate = data.payouts.filter((row) => row.status === "PAID" && row.paidAt).map((row) => row.paidAt!).sort().at(-1);
  const hasAffiliateCode = !data.account.code.startsWith("PENDING-");
  const referralUrl = hasAffiliateCode ? `${SITE_URL}?r=${data.account.code}` : null;
  const pendingCommission = data.commissionByStatus.PENDING ?? 0;
  const approvedCommission = data.commissionByStatus.APPROVED ?? 0;
  const lockedCommission = data.commissionByStatus.LOCKED ?? 0;
  const isFrozen = data.account.status === "SUSPENDED";

  const overviewCards = [
    { label: "Outstanding commission", value: formatCurrency(data.account.pendingEarnings), icon: DollarSign },
    { label: "Total paid to you — all time", value: formatCurrency(data.account.paidEarnings), icon: DollarSign },
    { label: "Latest payout date", value: latestPayoutDate ? formatDate(latestPayoutDate) : "No payout date recorded", icon: DollarSign },
    {
      label: "Total clicks",
      value: data.account.totalClicks.toLocaleString(),
      icon: MousePointerClick,
    },
    {
      label: "Referred orders",
      value: data.account.totalOrders.toLocaleString(),
      icon: ShoppingCart,
    },
    {
      label: "Conversion rate",
      value: `${data.conversionRate}%`,
      icon: Percent,
    },
    {
      label: "Current-month sales",
      value: formatCurrency(data.currentMonth.qualifyingSales),
      icon: TrendingUp,
    },
    {
      label: "Current tier",
      value: `${data.currentMonth.commissionRate}%`,
      icon: Percent,
    },
    {
      label: "Pending commission",
      value: formatCurrency(pendingCommission),
      icon: DollarSign,
    },
    {
      label: "Approved commission",
      value: formatCurrency(approvedCommission),
      icon: DollarSign,
    },
    {
      label: "Awaiting monthly payout",
      value: formatCurrency(lockedCommission),
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-8">
      {isFrozen ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-start gap-4 py-5">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-navy-deep">Affiliate account frozen</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Your account was frozen after missing the $300 monthly qualifying-sales
                minimum three times. Your code and referral discount are inactive while
                OVIpeps reviews the account.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {!hasAffiliateCode && !isFrozen ? <AffiliateCodeSetup /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal/10 text-teal">
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-xl font-semibold text-navy-deep">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">Outstanding commission includes pending, approved, and monthly payout amounts not yet paid. Your all-time paid total increases when OVIpeps records a payment. Figures refresh automatically every minute while this page is visible.</p>

      <Card className="border-sky/20 bg-gradient-to-br from-sky/5 to-cyan/5">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{data.currentMonth.periodLabel} — monthly sales progress</CardTitle>
            <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>{refreshing ? "Updating…" : "Refresh figures"}</Button>
          </div>
          <CardDescription>Qualifying sales from paid orders, after the customer discount and before shipping and taxes. Targets restart each month.</CardDescription>
          <p className="text-sm text-muted-foreground" role="status">Updates automatically every minute. Last updated: {new Intl.DateTimeFormat("en-CA", { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto", timeZoneName: "short" }).format(new Date(data.currentMonth.updatedAt))}.</p>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Qualifying sales this month</p>
            <p className="text-2xl font-semibold text-navy-deep">{formatCurrency(data.currentMonth.qualifyingSales)}</p>
            <p className="text-sm">Current commission tier: <strong>{data.currentMonth.commissionRate}%</strong></p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">$300 monthly minimum</p>
            <p className="text-2xl font-semibold text-navy-deep">{data.currentMonth.minimumMet ? "Minimum met" : `${formatCurrency(data.currentMonth.amountToMinimum)} more to sell`}</p>
            <progress className="h-3 w-full accent-teal" aria-label="Progress toward the $300 monthly minimum" value={Math.min(data.currentMonth.qualifyingSales, 300)} max={300} />
            <p className="text-sm">{data.currentMonth.minimumMet ? "You have met this month’s affiliate sales requirement." : "More qualifying sales needed this month to meet your affiliate requirement."}</p>
            <p className="text-sm text-muted-foreground">Missed minimums: {data.account.missedMinimumMonths} of 3. Three missed months, even if not consecutive, freeze your affiliate account.</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Next commission tier</p>
            <p className="text-2xl font-semibold text-navy-deep">{data.currentMonth.nextTierRate ? `${formatCurrency(data.currentMonth.amountToNextTier)} more to sell` : "Top 25% tier reached"}</p>
            {data.currentMonth.nextTierThreshold && data.currentMonth.nextTierRate ? <>
              <progress className="h-3 w-full accent-teal" aria-label={`Progress toward the ${data.currentMonth.nextTierRate}% commission tier`} value={Math.min(data.currentMonth.qualifyingSales, data.currentMonth.nextTierThreshold)} max={data.currentMonth.nextTierThreshold} />
              <p className="text-sm">Reach <strong>{formatCurrency(data.currentMonth.nextTierThreshold)}</strong> in qualifying sales this month for the <strong>{data.currentMonth.nextTierRate}%</strong> tier.</p>
            </> : <p className="text-sm">You have reached the highest commission tier for this month.</p>}
          </div>
        </CardContent>
      </Card>
      <PayoutEmailForm payoutEmail={data.account.payoutEmail} />

      {hasAffiliateCode && referralUrl ? <Card>
        <CardHeader>
          <CardTitle>Your referral link</CardTitle>
          <CardDescription>
            Share this link to earn 10%, 20%, or 25% based on your combined monthly
            qualifying sales. Customers using your active code receive 5% off.
            Attribution window: 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <CopyField label="Referral code" value={data.account.code} />
          <CopyField label="Referral URL" value={referralUrl} />
        </CardContent>
      </Card> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clicks (30 days)</CardTitle>
            <CardDescription>Daily referral link clicks</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {data.clickChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No click data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.clickChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(String(label))}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Clicks"
                    stroke="var(--color-teal)"
                    fill="var(--color-teal)"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commissions (30 days)</CardTitle>
            <CardDescription>Daily commission earned</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {data.commissionChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No commission data yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.commissionChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Commission"
                    stroke="var(--color-navy)"
                    fill="var(--color-navy)"
                    fillOpacity={0.12}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        title="Referrals"
        description="Tracked attribution sessions from your referral link"
        emptyMessage="No referral sessions recorded yet."
        columns={[
          { key: "date", label: "Date" },
          { key: "code", label: "Code" },
          { key: "converted", label: "Converted" },
          { key: "expires", label: "Expires" },
        ]}
        rows={data.attributions.map((row) => ({
          date: formatDate(row.createdAt),
          code: row.code,
          converted: row.converted ? (
            <Badge variant="success">Yes</Badge>
          ) : (
            <Badge variant="default">No</Badge>
          ),
          expires: formatDate(row.expiresAt),
        }))}
      />

      <DataTable
        title="Orders"
        description="Orders attributed to your referral code"
        emptyMessage="No referred orders yet."
        columns={[
          { key: "order", label: "Order" },
          { key: "amount", label: "Order total" },
          { key: "qualifying", label: "Qualifying subtotal" },
          { key: "rate", label: "Rate" },
          { key: "commission", label: "Commission" },
          { key: "status", label: "Status" },
        ]}
        rows={data.commissions.map((row) => ({
          order: row.orderNumber,
          amount: formatCurrency(row.orderAmount),
          qualifying: formatCurrency(row.commissionableAmount),
          rate: `${row.commissionRate}%`,
          commission: formatCurrency(row.commissionAmount),
          status: (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={commissionBadgeVariant(row.status)}>
                {COMMISSION_STATUS_LABELS[row.status]}
              </Badge>
              {row.flagged ? (
                <Badge variant="warning">Under review</Badge>
              ) : null}
            </div>
          ),
        }))}
      />

      <DataTable
        title="Commissions"
        description="Full commission ledger with status tracking"
        emptyMessage="No commissions recorded yet."
        columns={[
          { key: "date", label: "Date" },
          { key: "order", label: "Order" },
          { key: "amount", label: "Commission" },
          { key: "status", label: "Status" },
        ]}
        rows={data.commissions.map((row) => ({
          date: formatDate(row.createdAt),
          order: row.orderNumber,
          amount: formatCurrency(row.commissionAmount),
          status: (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={commissionBadgeVariant(row.status)}>
                {COMMISSION_STATUS_LABELS[row.status]}
              </Badge>
              {row.flagged ? (
                <Badge variant="warning" title={row.flagReason ?? undefined}>
                  Under review
                </Badge>
              ) : null}
            </div>
          ),
        }))}
      />

      <DataTable
        title="Payouts"
        description="Actual payout dates, payment history, and running total in CAD. Unpaid reports show Awaiting payment."
        emptyMessage="No payouts processed yet."
        columns={[
          { key: "period", label: "Commission month" },
          { key: "paid", label: "Payout date" },
          { key: "gross", label: "Gross sales" },
          { key: "owed", label: "Still owed" },
          { key: "received", label: "Amount received" },
          { key: "running", label: "Running paid total" },
          { key: "method", label: "Payment method" },
          { key: "reference", label: "Reference" },
          { key: "status", label: "Status" },

        ]}
        rows={data.payouts.map((row) => ({
          period: new Intl.DateTimeFormat("en-CA", {
            month: "long",
            year: "numeric",
          }).format(new Date(row.periodYear, row.periodMonth - 1, 1)),
          gross: formatCurrency(row.grossSales),
          owed: formatCurrency(row.status === "PAID" ? 0 : row.commissionOwed),
          received: row.status === "PAID" ? formatCurrency(row.paymentAmount ?? row.commissionOwed) : "—",
          running: row.runningPaidTotal === null ? "—" : formatCurrency(row.runningPaidTotal),
          method: row.paymentMethod === "E_TRANSFER" ? "e-Transfer" : row.paymentMethod === "CRYPTO" ? "Crypto" : "—",
          reference: row.paymentReference ?? "—",
          status: (
            <Badge
              variant={row.status === "PAID" ? "success" : "default"}
            >
              {row.status}
            </Badge>
          ),
          paid: row.paidAt ? formatDate(row.paidAt) : row.status === "PAID" ? "Date not recorded" : "Awaiting payment",
        }))}
      />
    </div>
  );
}
