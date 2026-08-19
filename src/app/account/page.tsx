import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Settings, User } from "lucide-react";
import { AccountNav } from "@/components/account/account-nav";
import { PageHero } from "@/components/content/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your OVIpeps account, orders, and settings.",
};

export default async function AccountPage() {
  const session = await requireAuth();
  if (!session?.user) {
    redirect("/account/login?callbackUrl=/account");
  }

  const [user, recentOrders] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, email: true },
    }),
    db.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        orderNumber: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    }),
  ]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    session.user.email;

  return (
    <>
      <PageHero
        eyebrow="Account"
        title={`Welcome back, ${user?.firstName ?? "Researcher"}`}
        description="View your orders, update your profile, and manage your research account."
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-4 truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <AccountNav />
            </div>
          </aside>

          <div className="space-y-6 lg:col-span-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-navy" />
                    <CardTitle className="text-base">Profile</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Link
                    href="/account/settings"
                    className="mt-3 inline-block text-sm font-medium text-accent hover:text-navy"
                  >
                    Edit settings
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-navy" />
                    <CardTitle className="text-base">Orders</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track payments, shipments, and order history.
                  </p>
                  <Link
                    href="/account/orders"
                    className="mt-3 inline-block text-sm font-medium text-accent hover:text-navy"
                  >
                    View all orders
                  </Link>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Recent Orders</CardTitle>
                  <Link
                    href="/account/orders"
                    className="text-sm font-medium text-accent hover:text-navy"
                  >
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      You haven&apos;t placed any orders yet.
                    </p>
                    <Link
                      href="/shop"
                      className="mt-3 inline-block text-sm font-medium text-accent hover:text-navy"
                    >
                      Browse the catalog
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {recentOrders.map((order) => (
                      <li key={order.orderNumber}>
                        <Link
                          href={`/account/orders/${order.orderNumber}`}
                          className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-navy"
                        >
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {order.orderNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatCurrency(order.total, order.currency)}
                            </p>
                            <p className="text-xs capitalize text-muted-foreground">
                              {order.status.replace(/_/g, " ").toLowerCase()}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-navy" />
                  <CardTitle className="text-base">Quick links</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4 text-sm">
                <Link href="/payment-instructions" className="text-accent hover:text-navy">
                  Payment instructions
                </Link>
                <Link href="/shipping" className="text-accent hover:text-navy">
                  Shipping info
                </Link>
                <Link href="/contact" className="text-accent hover:text-navy">
                  Contact support
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
