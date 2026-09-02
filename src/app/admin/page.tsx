import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics } from "@/lib/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  const statCards = [
    { label: "Revenue", value: formatCurrency(metrics.revenue) },
    { label: "Total Orders", value: metrics.totalOrders.toString() },
    {
      label: "Awaiting E-Transfer",
      value: metrics.awaitingPayment.toString(),
      highlight: metrics.awaitingPayment > 0,
    },
    { label: "Paid Orders", value: metrics.paidOrders.toString() },
    { label: "Average Order Value", value: formatCurrency(metrics.aov) },
    {
      label: "Affiliate Revenue",
      value: formatCurrency(metrics.affiliateRevenue),
    },
    {
      label: "Outstanding Commission",
      value: formatCurrency(metrics.outstandingCommission),
    },
    { label: "Active Restock Subscribers", value: metrics.activeRestockSubscribers.toString() },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-deep">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of store performance and pending actions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={stat.highlight ? "border-warning/40 bg-warning/5" : undefined}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-navy-deep">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Product</th>
                    <th className="pb-3 pr-4 font-medium">Qty Sold</th>
                    <th className="pb-3 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topProducts.map((product) => (
                    <tr key={product.productId} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{product.productName}</td>
                      <td className="py-3 pr-4 tabular-nums">{product.quantity}</td>
                      <td className="py-3 tabular-nums">
                        {formatCurrency(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
