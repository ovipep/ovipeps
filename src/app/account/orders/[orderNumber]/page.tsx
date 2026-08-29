import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Package, Truck } from "lucide-react";
import { AccountNav } from "@/components/account/account-nav";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { PageHero } from "@/components/content/page-hero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderDetailPageProps {
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber}`,
    description: "Order details and shipment tracking",
  };
}

function formatShippingAddress(address: unknown) {
  if (!address || typeof address !== "object") return null;
  const addr = address as Record<string, string>;
  return [
    `${addr.firstName ?? ""} ${addr.lastName ?? ""}`.trim(),
    addr.address1,
    addr.address2,
    `${addr.city ?? ""}, ${addr.province ?? ""} ${addr.postalCode ?? ""}`,
    addr.country === "CA" ? "Canada" : addr.country,
    addr.phone,
  ].filter(Boolean);
}

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

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await requireAuth();
  if (!session?.user) {
    redirect("/account/login?callbackUrl=/account/orders");
  }

  const { orderNumber } = await params;

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      shipments: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  const shippingLines = formatShippingAddress(order.shippingAddress);
  const trackingNumber =
    order.trackingNumber ?? order.shipments[0]?.trackingNumber;
  const trackingCarrier =
    order.trackingCarrier ?? order.shipments[0]?.carrier;

  return (
    <>
      <PageHero
        eyebrow="Account"
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${formatDate(order.createdAt)}`}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: "Account", href: "/account" },
            { label: "Orders", href: "/account/orders" },
            { label: order.orderNumber },
          ]}
          className="mb-8"
        />

        <div className="grid gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-4">
              <AccountNav isAdmin={(session.user as { role?: string }).role === "ADMIN"} />
            </div>
          </aside>

          <div className="space-y-6 lg:col-span-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={getStatusVariant(order.status)}>
                {order.status === "AWAITING_PAYMENT"
                  ? "ORDER SUBMITTED"
                  : order.status.replace(/_/g, " ")}
              </Badge>
              {order.paidAt ? (
                <span className="text-sm text-muted-foreground">
                  Paid {formatDate(order.paidAt)}
                </span>
              ) : null}
            </div>

            {(trackingNumber || order.shippedAt) && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-navy" />
                    <CardTitle>Shipment Tracking</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {trackingNumber ? (
                    <div>
                      <p className="text-muted-foreground">Tracking number</p>
                      <p className="font-mono font-medium">{trackingNumber}</p>
                    </div>
                  ) : null}
                  {trackingCarrier ? (
                    <div>
                      <p className="text-muted-foreground">Carrier</p>
                      <p className="font-medium">{trackingCarrier}</p>
                    </div>
                  ) : null}
                  {order.shippedAt ? (
                    <div>
                      <p className="text-muted-foreground">Shipped</p>
                      <p className="font-medium">{formatDate(order.shippedAt)}</p>
                    </div>
                  ) : null}
                  {order.shipments.length > 0 ? (
                    <ul className="space-y-2 border-t border-border pt-3">
                      {order.shipments.map((shipment) => (
                        <li key={shipment.id} className="text-muted-foreground">
                          {shipment.carrier ?? "Shipment"} —{" "}
                          <span className="font-mono text-foreground">
                            {shipment.trackingNumber ?? "Pending"}
                          </span>
                          {shipment.shippedAt
                            ? ` · ${formatDate(shipment.shippedAt)}`
                            : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {order.status === "AWAITING_PAYMENT" && (
              <Card className="border-warning/20 bg-warning/5">
                <CardContent className="py-4">
                  <p className="text-sm text-foreground">
                    This order is awaiting payment.{" "}
                    <Link
                      href="/payment-instructions"
                      className="font-medium text-accent hover:text-navy"
                    >
                      View payment instructions
                    </Link>
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-navy" />
                    <CardTitle>Order Items</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-muted-foreground">
                            {item.variantName} × {item.quantity}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 space-y-1 border-t border-border pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>{order.affiliateCode ? "Discount (includes affiliate 5%)" : "Discount"}</span>
                        <span>-{formatCurrency(order.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>
                        {order.shippingAmount === 0
                          ? "Free"
                          : formatCurrency(order.shippingAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 text-base font-semibold">
                      <span>Total</span>
                      <span className="text-navy">
                        {formatCurrency(order.total, order.currency)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingLines ? (
                    <address className="space-y-0.5 text-sm not-italic">
                      {shippingLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </address>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No shipping address on file.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-navy"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to orders
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
