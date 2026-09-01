import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BulkOrderResponseActions } from "@/components/products/bulk-order-response-actions";
import { ensureBulkOrderSchema, formatBulkOrderStatus, parseBulkOrderItems } from "@/lib/bulk-orders";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Bulk Order Decision" };
export const dynamic = "force-dynamic";

export default async function BulkOrderResponsePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ action?: string }> }) {
  const [{ token }, { action }] = await Promise.all([params, searchParams]);
  await ensureBulkOrderSchema();
  const [request, clock] = await Promise.all([
    db.bulkOrderRequest.findUnique({ where: { decisionToken: token } }),
    db.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS now`,
  ]);
  if (!request) notFound();
  const items = parseBulkOrderItems(request.items);
  const expired = !request.quoteExpiresAt || request.quoteExpiresAt < clock[0].now;
  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="rounded-3xl border border-sky/15 bg-white p-6 shadow-xl shadow-sky/10 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-sky">Bulk Order Quote</p>
      <h1 className="mt-2 text-3xl font-bold text-navy-deep">Confirm your decision</h1>
      <p className="mt-2 text-sm text-muted-foreground">Prepared for {request.firstName} {request.lastName}</p>
      <div className="mt-6 grid gap-3">{items.map((item) => <div key={item.productId} className="rounded-xl border border-sky/10 bg-sky/5 p-4"><p className="font-semibold text-navy-deep">{item.productName}</p><p className="mt-1 text-sm text-muted-foreground">{item.kits} kit{item.kits === 1 ? "" : "s"} · {item.units} units</p></div>)}</div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Discounted pricing</p><p className="mt-2 whitespace-pre-wrap text-sm">{request.discountedPricing}</p></div><div className="rounded-xl bg-muted/60 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ETA</p><p className="mt-2 whitespace-pre-wrap text-sm">{request.eta}</p></div></div>
      <div className="my-7 border-t border-border" />
      {expired ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">This 72-hour quote has expired. Please submit a new bulk order request.</p> : request.status !== "PENDING_DECISION" ? <p className="rounded-xl border border-sky/20 bg-sky/5 p-5 text-sm text-navy-deep">This request is currently <strong>{formatBulkOrderStatus(request.status)}</strong>.</p> : <BulkOrderResponseActions token={token} initialAction={action} />}
    </div>
  </div>;
}
