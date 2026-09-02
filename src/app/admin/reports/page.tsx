import { PrintReportButton } from "@/components/admin/print-report-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

function dateValue(date: Date) { return date.toISOString().slice(0, 10); }

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const fromText = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : dateValue(defaultFrom);
  const toText = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : dateValue(now);
  const from = new Date(`${fromText}T00:00:00.000Z`);
  const to = new Date(`${toText}T23:59:59.999Z`);

  const items = await db.orderItem.findMany({
    where: { order: { createdAt: { gte: from, lte: to }, status: { notIn: ["CANCELLED", "REFUNDED"] } } },
    select: { productId: true, productName: true, variantName: true, quantity: true, totalPrice: true, orderId: true },
  });
  const rows = new Map<string, { product: string; vial: string; units: number; sales: number; orders: Set<string> }>();
  for (const item of items) {
    const key = `${item.productId}:${item.variantName}`;
    const row = rows.get(key) ?? { product: item.productName, vial: item.variantName, units: 0, sales: 0, orders: new Set<string>() };
    row.units += item.quantity; row.sales += item.totalPrice; row.orders.add(item.orderId); rows.set(key, row);
  }
  const report = [...rows.values()].sort((a, b) => b.sales - a.sales);
  const totalSales = report.reduce((sum, row) => sum + row.sales, 0);
  const totalUnits = report.reduce((sum, row) => sum + row.units, 0);
  const totalOrders = new Set(items.map((item) => item.orderId)).size;

  return <div className="space-y-6 print:space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Sales Reports</h1><p className="mt-1 text-sm text-muted-foreground">Product sales by dollars and top-selling products for any date range.</p></div><div className="print:hidden"><PrintReportButton /></div></div>
    <form action="/admin/reports" method="get" className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] print:hidden">
      <label className="text-sm font-medium">From<Input name="from" type="date" defaultValue={fromText} className="mt-1" /></label>
      <label className="text-sm font-medium">To<Input name="to" type="date" defaultValue={toText} className="mt-1" /></label>
      <Button type="submit" className="self-end">Run report</Button>
    </form>
    <div className="text-sm"><strong>Reporting period:</strong> {fromText} to {toText}</div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Product sales</p><p className="text-2xl font-semibold">{formatCurrency(totalSales)}</p></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Vials sold</p><p className="text-2xl font-semibold">{totalUnits}</p></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Orders</p><p className="text-2xl font-semibold">{totalOrders}</p></div>
    </div>
    <div className="overflow-hidden rounded-xl border border-border bg-card"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/40 text-left"><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Vial size</th><th className="px-4 py-3 text-right">Vials sold</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Sales</th></tr></thead><tbody>
      {report.length ? report.map((row, index) => <tr key={`${row.product}-${row.vial}`} className="border-b border-border/60"><td className="px-4 py-3">#{index + 1}</td><td className="px-4 py-3 font-medium">{row.product}</td><td className="px-4 py-3">{row.vial}</td><td className="px-4 py-3 text-right">{row.units}</td><td className="px-4 py-3 text-right">{row.orders.size}</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.sales)}</td></tr>) : <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No product sales in this date range.</td></tr>}
    </tbody></table></div>
    <p className="text-xs text-muted-foreground">Product sales exclude shipping and exclude cancelled/refunded orders. Amounts are gross item sales before order-level discounts.</p>
  </div>;
}
