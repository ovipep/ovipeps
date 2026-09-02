import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminRestockSubscriptionsPage() {
  const [active, waitingByProduct, oneTime, ongoing] = await Promise.all([
    db.restockSubscription.count({ where: { status: "ACTIVE" } }),
    db.restockSubscriptionProduct.groupBy({
      by: ["productId"],
      where: { active: true, subscription: { status: "ACTIVE" } },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
    }),
    db.restockSubscription.count({ where: { status: "ACTIVE", notificationType: "ONE_TIME" } }),
    db.restockSubscription.count({ where: { status: "ACTIVE", notificationType: "ONGOING" } }),
  ]);
  const products = await db.product.findMany({
    where: { id: { in: waitingByProduct.map((entry) => entry.productId) } },
    select: { id: true, name: true },
  });
  const names = new Map(products.map((product) => [product.id, product.name]));
  return <div className="space-y-7">
    <div><h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Restock Subscribers</h1><p className="mt-1 text-sm text-muted-foreground">Active demand by product and notification duration. Customer addresses remain hidden here.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[{ label: "Active subscriptions", value: active }, { label: "One-time", value: oneTime }, { label: "Ongoing", value: ongoing }].map((item) => <Card key={item.label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-navy-deep">{item.value}</p></CardContent></Card>)}
    </div>
    <Card><CardHeader><CardTitle>Products customers are waiting for</CardTitle></CardHeader><CardContent>
      {waitingByProduct.length === 0 ? <p className="text-sm text-muted-foreground">No active product selections yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-3 font-medium">Product</th><th className="pb-3 text-right font-medium">Active selections</th></tr></thead><tbody>{waitingByProduct.map((entry) => <tr key={entry.productId} className="border-b border-border/60"><td className="py-3 font-medium">{names.get(entry.productId) ?? "Unavailable product"}</td><td className="py-3 text-right tabular-nums">{entry._count._all}</td></tr>)}</tbody></table></div>}
    </CardContent></Card>
  </div>;
}
