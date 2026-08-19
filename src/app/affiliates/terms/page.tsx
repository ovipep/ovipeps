import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { LegalSectionList } from "@/components/content/legal-section";
import { SITE_NAME } from "@/lib/content";

export const metadata: Metadata = {
  title: "Affiliate Program Terms",
  description:
    "Terms and conditions governing participation in the OVIpeps Partner Program.",
};

export default function AffiliateTermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Partner Program"
        title="Affiliate Program Terms"
        description={`Terms governing participation in the ${SITE_NAME} Partner Program.`}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Partner Program", href: "/affiliates" },
            { label: "Terms" },
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
              title: "Program overview",
              content: (
                <p>
                  The OVIpeps Partner Program allows approved affiliates to earn
                  commission on qualifying orders placed through their unique
                  referral links. By applying to or participating in the program,
                  you agree to these Affiliate Program Terms in addition to our{" "}
                  <Link href="/terms">Terms of Service</Link> and{" "}
                  <Link href="/privacy">Privacy Policy</Link>.
                </p>
              ),
            },
            {
              id: "eligibility",
              title: "Eligibility and approval",
              content: (
                <>
                  <p>
                    Partners must be at least 18 years of age. OVIpeps reviews all
                    applications and may approve or decline applicants at its sole
                    discretion. We reserve the right to suspend or terminate any
                    affiliate account that violates these terms or misrepresents our
                    products.
                  </p>
                  <p>
                    Approved partners receive dashboard access and a unique referral
                    code. Commission rates are set at approval and may be updated
                    with reasonable notice.
                  </p>
                </>
              ),
            },
            {
              id: "promotion",
              title: "Permitted promotion",
              content: (
                <>
                  <p>
                    Affiliates may promote OVIpeps through owned channels including
                    websites, social media, newsletters, and podcasts. All promotional
                    content must:
                  </p>
                  <ul>
                    <li>
                      Clearly state that OVIpeps products are for research use only
                    </li>
                    <li>
                      Avoid medical, therapeutic, or human consumption claims
                    </li>
                    <li>
                      Use accurate product descriptions consistent with our website
                    </li>
                    <li>Disclose the affiliate relationship where required by law</li>
                  </ul>
                  <p>
                    Prohibited activities include spam, misleading advertising,
                    coupon abuse, self-referral, paid search bidding on OVIpeps
                    trademarks without written permission, and promotion on sites
                    containing illegal or harmful content.
                  </p>
                </>
              ),
            },
            {
              id: "attribution",
              title: "Attribution and tracking",
              content: (
                <p>
                  Referrals are tracked via unique affiliate codes and cookies with
                  a 30-day attribution window. The last valid referral source at the
                  time of order placement receives credit. OVIpeps is not responsible
                  for tracking failures caused by cookie blockers, browser settings,
                  or technical issues outside our control.
                </p>
              ),
            },
            {
              id: "commissions",
              title: "Commissions and status",
              content: (
                <>
                  <p>
                    Commissions are calculated on the commissionable order subtotal
                    after discounts, excluding shipping and taxes. Commission statuses
                    include:
                  </p>
                  <ul>
                    <li>
                      <strong>Pending</strong> — order placed; awaiting payment
                      confirmation
                    </li>
                    <li>
                      <strong>Approved</strong> — payment confirmed; eligible for
                      payout
                    </li>
                    <li>
                      <strong>Locked</strong> — held during review or dispute period
                    </li>
                    <li>
                      <strong>Paid</strong> — included in a completed payout
                    </li>
                    <li>
                      <strong>Reversed</strong> — order refunded, cancelled, or
                      otherwise disqualified
                    </li>
                  </ul>
                  <p>
                    Commissions on refunded or cancelled orders may be reversed.
                    OVIpeps reserves the right to adjust commissions for pricing
                    errors, coupon abuse, or policy violations.
                  </p>
                </>
              ),
            },
            {
              id: "review",
              title: "Review and compliance",
              content: (
                <p>
                  OVIpeps may flag transactions or accounts for internal review when
                  unusual patterns are detected. Flagged items are reviewed by our
                  team and are not automatically treated as fraudulent. Partners will
                  be contacted if additional information is needed. We never
                  auto-accuse fraud — all flagged activity is assessed individually
                  before any commission adjustment.
                </p>
              ),
            },
            {
              id: "payouts",
              title: "Payouts",
              content: (
                <p>
                  Approved commissions are processed monthly, subject to a minimum
                  payout threshold communicated in your partner dashboard. Payout
                  methods and timing are determined by OVIpeps and may require
                  completed tax documentation where applicable.
                </p>
              ),
            },
            {
              id: "termination",
              title: "Termination",
              content: (
                <p>
                  Either party may terminate participation at any time. Upon
                  termination, pending commissions for qualifying orders placed
                  before termination may still be paid according to these terms.
                  OVIpeps may withhold commissions associated with violations of
                  these terms.
                </p>
              ),
            },
            {
              id: "changes",
              title: "Changes to terms",
              content: (
                <p>
                  OVIpeps may update these Affiliate Program Terms from time to time.
                  Material changes will be communicated to active partners. Continued
                  participation after changes take effect constitutes acceptance of
                  the updated terms.
                </p>
              ),
            },
            {
              id: "contact",
              title: "Contact",
              content: (
                <p>
                  Questions about the Partner Program? Contact{" "}
                  <a href="mailto:support@ovipeps.ca">support@ovipeps.ca</a> with
                  the subject line &quot;Affiliate Program&quot; or visit our{" "}
                  <Link href="/contact">contact page</Link>.
                </p>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
