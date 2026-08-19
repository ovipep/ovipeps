import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { LegalSectionList } from "@/components/content/legal-section";
import { SITE_NAME } from "@/lib/content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions governing use of the OVIpeps website and purchase of research-grade peptide products.",
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description={`Please read these terms carefully before using ${SITE_NAME} or placing a research order.`}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Terms of Service" },
          ]}
          className="mb-10"
        />

        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: August 2026
        </p>

        <LegalSectionList
          sections={[
            {
              id: "agreement",
              title: "Agreement to terms",
              content: (
                <>
                  <p>
                    By accessing ovipeps.ca or purchasing products from OVIpeps, you agree
                    to be bound by these Terms of Service and our{" "}
                    <Link href="/privacy">Privacy Policy</Link>. If you do not agree,
                    you may not use our website or services.
                  </p>
                </>
              ),
            },
            {
              id: "eligibility",
              title: "Eligibility",
              content: (
                <>
                  <p>
                    Our products are sold exclusively for laboratory and research
                    purposes. By placing an order, you represent that you are at least 18
                    years of age and that you are purchasing for legitimate research use
                    in a qualified setting.
                  </p>
                </>
              ),
            },
            {
              id: "research-only",
              title: "Research use only",
              content: (
                <>
                  <p>
                    All OVIpeps products are intended for in-vitro research and
                    laboratory use only. They are not approved for human consumption,
                    medical treatment, veterinary use, or diagnostic purposes.
                  </p>
                  <p>
                    By placing an order, you confirm that you understand and accept
                    these restrictions, that you will use products only for lawful
                    laboratory research, and that you will not use or promote products
                    for human or veterinary consumption.
                  </p>
                  <p>
                    You are solely responsible for ensuring that your purchase and use
                    of products complies with all applicable laws, regulations, and
                    institutional policies in your jurisdiction.
                  </p>
                </>
              ),
            },
            {
              id: "buyer-acknowledgment",
              title: "Buyer acknowledgment at checkout",
              content: (
                <>
                  <p>
                    Completing checkout requires agreement to these Terms of Service and
                    our Privacy Policy. That acknowledgment constitutes your acceptance
                    of all terms on this page, including research-use restrictions,
                    limitations of liability, shipping and returns policies, and payment
                    conditions.
                  </p>
                </>
              ),
            },
            {
              id: "orders",
              title: "Orders & payment",
              content: (
                <>
                  <p>
                    All prices are listed in Canadian dollars (CAD) unless otherwise
                    stated. We reserve the right to refuse or cancel orders at our
                    discretion, including orders with incorrect pricing, products marked
                    out of stock, or suspected fraudulent activity.
                  </p>
                  <p>
                    Payment is accepted via Interac e-Transfer as described in our{" "}
                    <Link href="/payment-instructions">Payment Instructions</Link>.
                    Orders are fulfilled after payment confirmation.
                  </p>
                </>
              ),
            },
            {
              id: "shipping",
              title: "Shipping & delivery",
              content: (
                <>
                  <p>
                    Shipping terms are governed by our{" "}
                    <Link href="/shipping">Shipping Policy</Link>. Risk of loss passes
                    to you upon delivery to the carrier, except where prohibited by
                    applicable law.
                  </p>
                </>
              ),
            },
            {
              id: "returns",
              title: "Returns & refunds",
              content: (
                <>
                  <p>
                    Returns and refunds are handled in accordance with our{" "}
                    <Link href="/returns">Returns & Refunds</Link> policy.
                  </p>
                </>
              ),
            },
            {
              id: "ip",
              title: "Intellectual property",
              content: (
                <>
                  <p>
                    All content on this website — including text, graphics, logos, and
                    product descriptions — is the property of OVIpeps or its licensors
                    and is protected by applicable intellectual property laws. You may
                    not reproduce, distribute, or create derivative works without written
                    permission.
                  </p>
                </>
              ),
            },
            {
              id: "disclaimer",
              title: "Disclaimer of warranties",
              content: (
                <>
                  <p>
                    Products and website content are provided &quot;as is&quot; without
                    warranties of any kind, express or implied, including fitness for a
                    particular research purpose. OVIpeps does not warrant uninterrupted
                    or error-free website operation.
                  </p>
                </>
              ),
            },
            {
              id: "liability",
              title: "Limitation of liability",
              content: (
                <>
                  <p>
                    To the fullest extent permitted by law, OVIpeps shall not be liable
                    for indirect, incidental, special, or consequential damages arising
                    from your use of our products or website. Our total liability for any
                    claim shall not exceed the amount you paid for the relevant order.
                  </p>
                </>
              ),
            },
            {
              id: "governing",
              title: "Governing law",
              content: (
                <>
                  <p>
                    These terms are governed by the laws of Canada and the province in
                    which OVIpeps operates. Disputes shall be resolved in the courts of
                    competent jurisdiction in Canada.
                  </p>
                </>
              ),
            },
            {
              id: "changes",
              title: "Changes to terms",
              content: (
                <>
                  <p>
                    We may update these terms from time to time. Continued use of the
                    website after changes constitutes acceptance of the revised terms.
                    The &quot;Last updated&quot; date at the top of this page indicates
                    when changes were last made.
                  </p>
                </>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
