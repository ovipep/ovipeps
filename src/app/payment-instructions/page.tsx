import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { LegalSectionList } from "@/components/content/legal-section";
import { getSiteSetting } from "@/lib/products";

export const metadata: Metadata = {
  title: "Payment Instructions",
  description:
    "How to pay for your OVIpeps order using Interac e-Transfer — step-by-step instructions for Canadian research customers.",
};

export default async function PaymentInstructionsPage() {
  const [configuredEmail, configuredInstructions] = await Promise.all([
    getSiteSetting("etransfer_email"),
    getSiteSetting("etransfer_instructions"),
  ]);
  const etransferEmail =
    configuredEmail ?? "orders@ovipeps.ca";
  const instructions =
    configuredInstructions ??
    `Please send your Interac e-Transfer to ${etransferEmail}. Include your order number in the message field.`;

  return (
    <>
      <PageHero
        eyebrow="Checkout"
        title="Payment Instructions"
        description="OVIpeps accepts Interac e-Transfer for Canadian orders. Follow these steps after placing your order."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Payment Instructions" },
          ]}
          className="mb-10"
        />

        <div className="mb-10 rounded-xl border border-teal/20 bg-teal/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal">
            Interac e-Transfer
          </p>
          <p className="mt-2 text-2xl font-semibold text-navy-deep">
            {etransferEmail}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {instructions}
          </p>
        </div>

        <LegalSectionList
          sections={[
            {
              id: "steps",
              title: "Step-by-step payment",
              content: (
                <>
                  <ol>
                    <li>
                      Complete checkout and note your unique <strong>order number</strong>
                    </li>
                    <li>
                      Log in to your Canadian bank&apos;s online banking or mobile app
                    </li>
                    <li>
                      Send an Interac e-Transfer to{" "}
                      <strong>{etransferEmail}</strong>
                    </li>
                    <li>
                      Enter your <strong>order number</strong> in the message or memo
                      field — this is required to match your payment
                    </li>
                    <li>
                      Send the exact order total shown at checkout (CAD)
                    </li>
                    <li>
                      Your order status is updated after payment is verified
                    </li>
                  </ol>
                </>
              ),
            },
            {
              id: "timing",
              title: "Payment confirmation",
              content: (
                <>
                  <p>
                    Most e-Transfers are confirmed within a few hours during business
                    days. Transfers sent evenings, weekends, or holidays are processed
                    on the next business day.
                  </p>
                  <p>
                    Your order will not ship until payment is confirmed. Registered
                    customers can review linked orders from their account dashboard;
                    guest customers should retain their protected confirmation link.
                  </p>
                </>
              ),
            },
            {
              id: "security",
              title: "Security & privacy",
              content: (
                <>
                  <p>
                    Never send payment to an email address other than the one shown on
                    this page or in your official OVIpeps order confirmation. If you
                    receive suspicious payment instructions, contact{" "}
                    <a href="mailto:support@ovipeps.ca">support@ovipeps.ca</a> before
                    sending funds.
                  </p>
                </>
              ),
            },
            {
              id: "issues",
              title: "Payment issues",
              content: (
                <>
                  <p>Contact support if:</p>
                  <ul>
                    <li>You sent payment without your order number in the message</li>
                    <li>You sent the wrong amount</li>
                    <li>Your payment has not been confirmed within 24 business hours</li>
                    <li>You need to update your order before payment</li>
                  </ul>
                  <p>
                    Include your order number and the email address used for the
                    e-Transfer when contacting support.
                  </p>
                </>
              ),
            },
          ]}
        />

        <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6 text-sm">
          <p className="font-medium text-navy-deep">Related</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link href="/shipping" className="text-accent hover:text-navy">
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link href="/research/faq" className="text-accent hover:text-navy">
                FAQ — Payment questions
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
