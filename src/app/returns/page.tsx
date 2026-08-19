import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { LegalSectionList } from "@/components/content/legal-section";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "OVIpeps returns and refund policy for research peptide orders — eligibility, timelines, and how to request support.",
};

export default function ReturnsPage() {
  return (
    <>
      <PageHero
        eyebrow="Policies"
        title="Returns & Refunds"
        description="Fair and transparent policies for research orders, designed with laboratory procurement requirements in mind."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Returns & Refunds" },
          ]}
          className="mb-10"
        />

        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: August 2026
        </p>

        <LegalSectionList
          sections={[
            {
              id: "overview",
              title: "Overview",
              content: (
                <>
                  <p>
                    OVIpeps stands behind the quality of our research materials. Because
                    peptides and laboratory supplies require controlled handling, our
                    return policy balances researcher needs with product integrity and
                    safety requirements.
                  </p>
                </>
              ),
            },
            {
              id: "eligible",
              title: "Eligible returns",
              content: (
                <>
                  <p>We may accept returns or provide replacements when:</p>
                  <ul>
                    <li>You received the incorrect product or variant</li>
                    <li>Your order arrived with verifiable shipping damage</li>
                    <li>A product was shipped in error by OVIpeps</li>
                  </ul>
                  <p>
                    To be eligible, items must be unopened, unused, and in their
                    original sealed condition unless the return is due to our shipping
                    or fulfillment error.
                  </p>
                </>
              ),
            },
            {
              id: "non-returnable",
              title: "Non-returnable items",
              content: (
                <>
                  <p>We cannot accept returns for:</p>
                  <ul>
                    <li>Products that have been opened, reconstituted, or used</li>
                    <li>Items stored improperly after delivery</li>
                    <li>Orders where the customer provided an incorrect address</li>
                    <li>Products purchased for purposes other than laboratory research</li>
                  </ul>
                </>
              ),
            },
            {
              id: "process",
              title: "How to request a return",
              content: (
                <>
                  <p>
                    Contact{" "}
                    <a href="mailto:support@ovipeps.ca">support@ovipeps.ca</a> within{" "}
                    <strong>7 days</strong> of delivery with your order number, a
                    description of the issue, and supporting photos where applicable.
                  </p>
                  <p>
                    Our team will review your request and provide return instructions if
                    approved. Unauthorized returns may not be processed.
                  </p>
                </>
              ),
            },
            {
              id: "refunds",
              title: "Refunds",
              content: (
                <>
                  <p>
                    Approved refunds are issued to the original payment method. For
                    Interac e-Transfer orders, refunds are sent to the email address
                    associated with your payment within 5–10 business days after
                    approval.
                  </p>
                  <p>
                    Original shipping charges are non-refundable unless the return is
                    due to an OVIpeps error.
                  </p>
                </>
              ),
            },
            {
              id: "cancellations",
              title: "Order cancellations",
              content: (
                <>
                  <p>
                    Orders may be cancelled before shipment if payment has not yet been
                    confirmed, or if processing has not begun. Contact support as soon as
                    possible to request cancellation.
                  </p>
                  <p>
                    Once an order has shipped, standard return policies apply.
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
              <Link href="/shipping" className="text-accent hover:text-navy">
                Shipping Policy
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
