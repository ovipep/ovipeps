import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { expireUnpaidOrders } from "@/lib/orders";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "AWAITING_PAYMENT", label: "Submitted / Awaiting Payment" },
  { value: "PAYMENT_RECEIVED", label: "Payment Received" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  await expireUnpaidOrders();
  const statusFilter = status && status !== "all" ? status : undefined;

  const orders = await db.order.findMany({
    where: statusFilter ? { status: statusFilter as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      orderNumber: true,
      email: true,
      status: true,
      total: true,
      paymentReference: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-deep">
          Orders
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage orders and confirm e-Transfer payments.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive =
            filter.value === "all"
              ? !statusFilter
              : statusFilter === filter.value;

          return (
            <Link key={filter.value} href={`/admin/orders?status=${filter.value}`}>
              <Button
                variant={isActive ? "primary" : "outline"}
                size="sm"
                className="pointer-events-none"
              >
                {filter.label}
              </Button>
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className={cn(
                    "border-b border-border/60 transition-colors hover:bg-muted/30",
                    order.status === "AWAITING_PAYMENT" && "bg-warning/5"
                  )}
                >
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">{order.email}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
