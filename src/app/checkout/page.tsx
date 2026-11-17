import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Checkout | OVIpeps",
  description: "Complete your research peptide order",
};

export default async function CheckoutPage() {
  const session = await requireAuth();
  if (!session?.user?.id) {
    redirect("/account/login?callbackUrl=%2Fcheckout");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { addresses: { orderBy: { updatedAt: "desc" } } },
  });
  if (!user) {
    redirect("/account/login?callbackUrl=%2Fcheckout");
  }

  const billingAddress =
    user.addresses.find((address) => address.label === "Billing") ??
    user.addresses.find((address) => address.isDefault) ??
    null;
  const shippingAddress =
    user.addresses.find((address) => address.label === "Shipping") ??
    user.addresses.find((address) => address.isDefault) ??
    null;

  return (
    <div className="bg-gradient-to-b from-sky/5 via-background to-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-sky">
            Simple Order Submission
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-navy-deep via-sky to-cyan bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-3 text-muted-foreground">
            Sign in or create an account to order. Add billing information to your account, then choose shipping or pickup. No
            card numbers or payment credentials are collected or processed on this website.
          </p>
        </div>
        <CheckoutForm
          email={user.email}
          firstName={user.firstName ?? ""}
          lastName={user.lastName ?? ""}
          billingAddress={billingAddress ? {
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName,
            address1: billingAddress.address1,
            address2: billingAddress.address2,
            city: billingAddress.city,
            province: billingAddress.province,
            postalCode: billingAddress.postalCode,
            phone: billingAddress.phone,
          } : null}
          shippingAddress={shippingAddress ? {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2,
            city: shippingAddress.city,
            province: shippingAddress.province,
            postalCode: shippingAddress.postalCode,
            phone: shippingAddress.phone,
          } : null}
        />
      </div>
    </div>
  );
}
