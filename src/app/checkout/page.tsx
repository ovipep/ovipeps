import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Checkout | OVIpeps",
  description: "Complete your research peptide order",
};

export default function CheckoutPage() {
  return (
    <div className="bg-gradient-to-b from-sky/5 via-background to-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-sky">
            Clear e-Transfer Checkout
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-navy-deep via-sky to-cyan bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-3 text-muted-foreground">
            Enter your shipping details and place your order. Payment via Interac
            e-Transfer.
          </p>
        </div>
        <CheckoutForm />
      </div>
    </div>
  );
}
