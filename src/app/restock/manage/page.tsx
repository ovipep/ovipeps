import Link from "next/link";
import { RestockManager } from "@/components/products/restock-manager";
import { getManagedRestockSubscription } from "@/lib/restock-notifications";

export default async function ManageRestockPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const subscription = token ? await getManagedRestockSubscription(token) : null;
  return <main className="mx-auto min-h-[60vh] max-w-2xl px-4 py-16 sm:px-6">
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-sky">OVIpeps</p>
      <h1 className="mt-2 text-2xl font-semibold text-navy-deep">Manage restock notifications</h1>
      {!subscription || subscription.status !== "ACTIVE" ? <div className="mt-5">
        <p className="text-sm leading-relaxed text-muted-foreground">This management link is invalid, expired, or the subscription is no longer active.</p>
        <Link className="mt-5 inline-block font-semibold text-sky" href="/shop">Return to the shop</Link>
      </div> : <div className="mt-6">
        <p className="mb-5 text-sm text-muted-foreground">Notifications are being sent to {subscription.email.replace(/^(.{2}).*(@.*)$/, "$1••••$2")}.</p>
        <RestockManager token={token} allInventory={subscription.allInventory} products={subscription.products.map((item) => item.product)} />
      </div>}
    </div>
  </main>;
}
