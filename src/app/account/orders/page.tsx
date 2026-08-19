import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Package } from "lucide-react";
import { AccountNav } from "@/components/account/account-nav";
import { PageHero } from "@/components/content/page-hero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order History",
  description: "View your OVIpeps order history and track shipments.",
};

function getStatusVariant(
  status: string
): "default" | "success" | "warning" | "research" {
  switch (status) {
    case "COMPLETED":
    case "PAYMENT_RECEIVED":
      return "success";
    case "SHIPPED":
    case "PROCESSING":
      return "research";
    case "AWAITING_PAYMENT":
      return "warning";
    default:
      return "default";
  }
}

export default async function OrdersPage() {
  const session = await requireAuth();
  if (!session?.user) {
    redirect("/account/login?callbackUrl=/account/orders");
  }

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { id: true } },
    },
  });

  return (
    <>
      <PageHero
        eyebrow="Account"
        title="Order History"
        description="View order details, payment status, and shipment tracking."
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-4">
              <AccountNav />
            </div>
          </aside>

          <div className="lg:col-span-3">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <h2 className="mt-4 text-lg font-semibold text-navy-deep">
                    No orders yet
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    When you place an order, it will appear here.
                  </p>
                  <Link
                    href="/shop"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-navy"
                  >
                    Browse catalog
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="font-mono text-base">
                            {order.orderNumber}
                          </CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Placed {formatDate(order.createdAt)} · {order.items.length}{" "}
                            {order.items.length === 1 ? "item" : "items"}
                          </p>
                        </div>
                        <Badge variant={getStatusVariant(order.status)}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-lg font-semibold text-navy">
                        {formatCurrency(order.total, order.currency)}
                      </p>
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-navy"
                      >
                        View details
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
