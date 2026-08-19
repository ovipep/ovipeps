import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { LegalSectionList } from "@/components/content/legal-section";
import { getSiteSetting } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "OVIpeps shipping policy for Canadian research peptide orders — processing times, carriers, tracking, and delivery information.",
};

export default async function ShippingPage() {
  const [configuredThreshold, configuredMessage] = await Promise.all([
    getSiteSetting("shipping_threshold"),
    getSiteSetting("free_shipping_message"),
  ]);
  const threshold = configuredThreshold ?? "300";
  const freeShippingMessage =
    configuredMessage ?? `Free shipping on orders over $${threshold} CAD`;

  return (
    <>
      <PageHero
        eyebrow="Policies"
        title="Shipping Policy"
        description="Canadian fulfillment with transparent processing timelines and tracked delivery for qualified research orders."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Shipping Policy" },
          ]}
          className="mb-10"
        />

        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: August 2026
        </p>

        <LegalSectionList
          sections={[
            {
              id: "fulfillment",
              title: "Canadian fulfillment",
              content: (
                <>
                  <p>
                    OVIpeps fulfills research orders from within Canada. Domestic
                    fulfillment helps reduce cross-border delays and provides
                    researchers with local support for order inquiries, documentation
                    requests, and shipment tracking.
                  </p>
                </>
              ),
            },
            {
              id: "processing",
              title: "Order processing",
              content: (
                <>
                  <p>
                    Orders are processed after payment has been confirmed. Because we
                    accept Interac e-Transfer, processing begins once your transfer is
                    received and matched to your order number.
                  </p>
                  <p>
                    Typical processing time is <strong>1–2 business days</strong>{" "}
                    after payment confirmation. Orders placed on weekends or Canadian
                    statutory holidays are processed on the next business day.
                  </p>
                </>
              ),
            },
            {
              id: "rates",
              title: "Shipping rates",
              content: (
                <>
                  <p>{freeShippingMessage}.</p>
                  <p>
                    A flat shipping rate is shown at checkout for orders below the
                    free-shipping threshold. Any applicable shipping charge appears
                    before you place the order.
                  </p>
                </>
              ),
            },
            {
              id: "carriers",
              title: "Carriers & tracking",
              content: (
                <>
                  <p>
                    Shipments are sent via reputable Canadian carriers with tracking
                    provided where available. When your order ships, you will receive a
                    confirmation email with tracking details when applicable.
                  </p>
                  <p>
                    Delivery timelines vary by province and carrier service. Remote or
                    northern destinations may require additional transit time.
                  </p>
                </>
              ),
            },
            {
              id: "address",
              title: "Shipping address requirements",
              content: (
                <>
                  <p>
                    Please ensure your shipping address is complete and accurate at
                    checkout. OVIpeps is not responsible for delays caused by incorrect
                    addresses provided by the customer.
                  </p>
                  <p>
                    We currently ship to addresses within Canada. Research institutions
                    and laboratories may use their institutional shipping address.
                  </p>
                </>
              ),
            },
            {
              id: "issues",
              title: "Lost or damaged shipments",
              content: (
                <>
                  <p>
                    If your shipment arrives damaged or appears lost in transit, contact
                    us at{" "}
                    <a href="mailto:support@ovipeps.ca">support@ovipeps.ca</a> within
                    7 days of the expected delivery date. Include your order number and
                    photos of any visible damage to packaging.
                  </p>
                  <p>
                    We will work with you and the carrier to resolve eligible claims in
                    accordance with this policy and carrier terms.
                  </p>
                </>
              ),
            },
          ]}
        />

        <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6 text-sm">
          <p className="font-medium text-navy-deep">Related policies</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link href="/returns" className="text-accent hover:text-navy">
                Returns & Refunds
              </Link>
            </li>
            <li>
              <Link href="/payment-instructions" className="text-accent hover:text-navy">
                Payment Instructions
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-accent hover:text-navy">
                Contact Support
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
