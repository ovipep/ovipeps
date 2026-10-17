import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureBulkOrderSchema } from "@/lib/bulk-orders";
import { bulkAddressSchema, type BulkPlan } from "@/lib/bulk-checkout-schema";
import { BulkAddressConfirmation } from "@/components/products/bulk-address-confirmation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Confirm Bulk Order",
  robots: { index: false, follow: false },
};
export default async function BulkCheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await requireAuth();
  if (!session?.user?.email)
    redirect(
      `/account/login?callbackUrl=${encodeURIComponent(`/bulk-order-checkout/${token}`)}`,
    );
  await ensureBulkOrderSchema();
  const request = await db.bulkOrderRequest.findUnique({
    where: { decisionToken: token },
  });
  if (
    !request ||
    request.email.toLowerCase() !== session.user.email.toLowerCase()
  )
    notFound();
  let recordedAddress: ReturnType<typeof bulkAddressSchema.safeParse> | undefined;
  if (request.orderId) {
    const order = await db.order.findUnique({ where: { id: request.orderId } });
    if (order?.userId === session.user.id) redirect(`/account/orders/${order.orderNumber}`);
    if (order?.userId || (order && order.email.toLowerCase() !== session.user.email.toLowerCase())) notFound();
    recordedAddress = bulkAddressSchema.safeParse(order?.shippingAddress);
  }
  const clock = await db.$queryRaw<
    Array<{ now: Date }>
  >`SELECT CURRENT_TIMESTAMP AS now`;
  if (
    !request.recapApprovedAt ||
    !request.recapSentAt ||
    !request.checkoutPlan ||
    !request.recapVersion ||
    !request.checkoutExpiresAt ||
    request.checkoutExpiresAt < clock[0].now ||
    request.status === "OPTED_OUT"
  )
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">
          Quote awaiting approval or expired
        </h1>
        <p className="mt-4">
          Please contact{" "}
          <a href="mailto:ovipeps@gmail.com">ovipeps@gmail.com</a> before paying
          or placing an order.
        </p>
      </main>
    );
  const plan = request.checkoutPlan as unknown as BulkPlan;
  const address = (recordedAddress?.success ? recordedAddress.data : null) ?? await db.address.findFirst({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-deep">
        Confirm your bulk order
      </h1>
      <p>
        Signed in as {session.user.email}. Review your order and confirm your
        shipping address.
      </p>
      <div className="rounded-2xl border p-6">
        <ul className="space-y-3">
          {plan.items.map((i) => (
            <li key={i.variantId}>
              {i.productName} — {i.variantName} × {i.quantity}
              <strong className="float-right">
                ${i.totalPrice.toFixed(2)} CAD
              </strong>
            </li>
          ))}
        </ul>
        <p className="mt-5">
          Shipping: ${plan.shippingAmount.toFixed(2)} · Tax: $
          {plan.taxAmount.toFixed(2)}
        </p>
        <p className="mt-3 text-xl font-bold">
          Total: ${plan.total.toFixed(2)} CAD
        </p>
        <p className="mt-4 whitespace-pre-wrap">{plan.fulfillmentNote}</p>
        {plan.allowBackorder && (
          <p className="mt-3 text-sm">
            Bulk items await restock unless OVIpeps explicitly allocates available
            inventory. Existing reservations are retained. Pending units ship
            when restocked.
          </p>
        )}
      </div>
      <BulkAddressConfirmation
        token={token}
        version={request.recapVersion}
        address={
          address
            ? {
                firstName: address.firstName,
                lastName: address.lastName,
                address1: address.address1,
                address2: address.address2 ?? "",
                city: address.city,
                province: address.province,
                postalCode: address.postalCode,
                country: "CA",
                phone: address.phone ?? "",
              }
            : undefined
        }
      />
      <Link href="/account/orders" className="text-sky underline">
        View your recorded orders
      </Link>
    </main>
  );
}
