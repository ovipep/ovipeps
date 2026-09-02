import { notFound } from "next/navigation";
import { ConfirmPaymentButton } from "@/components/admin/confirm-payment-button";
import { ShipOrderButton } from "@/components/admin/ship-order-button";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { ResendConfirmationButton } from "@/components/admin/resend-confirmation-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    notFound();
  }

  const address = order.shippingAddress as ShippingAddress | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-deep">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.status === "AWAITING_PAYMENT" && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle>Awaiting E-Transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm payment once the Interac e-Transfer has been received.
            </p>
            {order.paymentReference && (
              <p className="text-sm">
                <span className="font-medium">Reference:</span>{" "}
                {order.paymentReference}
              </p>
            )}
            <ConfirmPaymentButton orderId={order.id} />
          </CardContent>
        </Card>
      )}

      {(order.status === "PROCESSING" || order.status === "PAYMENT_RECEIVED") && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader><CardTitle>Pending Shipping</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Select Shipped after this order has been shipped. The order status will then change to Complete.</p>
            <ShipOrderButton orderId={order.id} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{order.email}</p>
            {order.affiliateCode && (
              <p className="text-muted-foreground">
                Affiliate: {order.affiliateCode}
              </p>
            )}
            {order.discountCode && (
              <p className="text-muted-foreground">
                Discount: {order.discountCode}
              </p>
            )}
            <div className="pt-3">
              <ResendConfirmationButton orderId={order.id} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {address ? (
              <address className="not-italic space-y-0.5">
                <p>
                  {address.firstName} {address.lastName}
                </p>
                <p>{address.address1}</p>
                {address.address2 && <p>{address.address2}</p>}
                <p>
                  {address.city}, {address.province} {address.postalCode}
                </p>
                <p>{address.country}</p>
                {address.phone && <p>{address.phone}</p>}
              </address>
            ) : (
              <p className="text-muted-foreground">No address on file.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Product</th>
                <th className="pb-3 pr-4 font-medium">SKU</th>
                <th className="pb-3 pr-4 font-medium">Qty</th>
                <th className="pb-3 pr-4 font-medium">Unit</th>
                <th className="pb-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="py-3 pr-4">
                    {item.productName}
                    {item.variantName && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {item.variantName}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{item.sku}</td>
                  <td className="py-3 pr-4 tabular-nums">{item.quantity}</td>
                  <td className="py-3 pr-4 tabular-nums">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-3 tabular-nums">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {order.affiliateCode ? "Discount (includes affiliate 5%)" : "Discount"}
              </span>
              <span className="tabular-nums">
                -{formatCurrency(order.discountAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="tabular-nums">
              {formatCurrency(order.shippingAmount)}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      {order.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Method</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {order.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/60">
                    <td className="py-3 pr-4">{payment.method}</td>
                    <td className="py-3 pr-4">{payment.status}</td>
                    <td className="py-3 pr-4 tabular-nums">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {payment.confirmedAt
                        ? formatDate(payment.confirmedAt)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
