import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { LegalSectionList } from "@/components/content/legal-section";
import { SITE_NAME } from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How OVIpeps collects, uses, and protects your personal information when you browse, order, or contact us.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description={`${SITE_NAME} is committed to protecting the privacy of researchers, customers, and website visitors in accordance with Canadian privacy principles.`}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Privacy Policy" },
          ]}
          className="mb-10"
        />

        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: August 2026
        </p>

        <LegalSectionList
          sections={[
            {
              id: "introduction",
              title: "Introduction",
              content: (
                <>
                  <p>
                    This Privacy Policy describes how OVIpeps (&quot;we,&quot;
                    &quot;us,&quot; or &quot;our&quot;) collects, uses, discloses, and
                    safeguards personal information when you visit ovipeps.ca, create an
                    account, place an order, or communicate with us.
                  </p>
                  <p>
                    By using our website, you consent to the practices described in this
                    policy. If you do not agree, please discontinue use of our services.
                  </p>
                </>
              ),
            },
            {
              id: "collection",
              title: "Information we collect",
              content: (
                <>
                  <p>We may collect the following types of information:</p>
                  <ul>
                    <li>
                      <strong>Account information</strong> — name, email address, phone
                      number, and password credentials
                    </li>
                    <li>
                      <strong>Order information</strong> — shipping and billing addresses,
                      order history, and payment references
                    </li>
                    <li>
                      <strong>Communications</strong> — messages sent through contact
                      forms or email support
                    </li>
                    <li>
                      <strong>Technical data</strong> — IP address, browser type, device
                      information, and usage analytics
                    </li>
                    <li>
                      <strong>Affiliate data</strong> — referral codes and attribution
                      information for partner program participants
                    </li>
                  </ul>
                </>
              ),
            },
            {
              id: "use",
              title: "How we use your information",
              content: (
                <>
                  <p>We use personal information to:</p>
                  <ul>
                    <li>Process and fulfill research product orders</li>
                    <li>Confirm Interac e-Transfer payments and send order updates</li>
                    <li>Provide customer support and respond to inquiries</li>
                    <li>Maintain account security and prevent fraud</li>
                    <li>Improve our website, products, and services</li>
                    <li>Administer our affiliate program where applicable</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </>
              ),
            },
            {
              id: "sharing",
              title: "Information sharing",
              content: (
                <>
                  <p>
                    We do not sell your personal information. We may share information
                    with:
                  </p>
                  <ul>
                    <li>
                      <strong>Service providers</strong> — shipping carriers, payment
                      processors, email services, and hosting providers who assist in
                      operating our business
                    </li>
                    <li>
                      <strong>Legal requirements</strong> — when required by law, court
                      order, or to protect our rights and safety
                    </li>
                    <li>
                      <strong>Business transfers</strong> — in connection with a merger,
                      acquisition, or sale of assets, with notice where required
                    </li>
                  </ul>
                </>
              ),
            },
            {
              id: "cookies",
              title: "Cookies & tracking",
              content: (
                <>
                  <p>
                    We use cookies and similar technologies to maintain sessions,
                    remember preferences, and understand how visitors use our site.
                    Affiliate referral codes may be stored in cookies or local storage to
                    attribute qualifying orders.
                  </p>
                  <p>
                    You can control cookies through your browser settings. Disabling
                    cookies may affect certain site functionality.
                  </p>
                </>
              ),
            },
            {
              id: "retention",
              title: "Data retention",
              content: (
                <>
                  <p>
                    We retain personal information for as long as necessary to fulfill
                    the purposes described in this policy, including order records,
                    support communications, and legal compliance requirements.
                  </p>
                </>
              ),
            },
            {
              id: "security",
              title: "Security",
              content: (
                <>
                  <p>
                    We implement reasonable technical and organizational measures to
                    protect personal information against unauthorized access, alteration,
                    or disclosure. No method of transmission over the internet is
                    completely secure.
                  </p>
                </>
              ),
            },
            {
              id: "rights",
              title: "Your rights",
              content: (
                <>
                  <p>
                    Depending on applicable law, you may have the right to access,
                    correct, or delete your personal information, or to withdraw consent
                    where processing is consent-based.
                  </p>
                  <p>
                    To exercise these rights, contact{" "}
                    <a href="mailto:support@ovipeps.ca">support@ovipeps.ca</a>. We will
                    respond within a reasonable timeframe.
                  </p>
                </>
              ),
            },
            {
              id: "contact",
              title: "Contact us",
              content: (
                <>
                  <p>
                    For privacy-related questions or requests, email{" "}
                    <a href="mailto:support@ovipeps.ca">support@ovipeps.ca</a> or use
                    our{" "}
                    <Link href="/contact">contact form</Link>.
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
