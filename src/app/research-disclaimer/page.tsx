import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { LegalSectionList } from "@/components/content/legal-section";
import { getSiteSetting } from "@/lib/products";

export const metadata: Metadata = {
  title: "Research Disclaimer",
  description:
    "Important research-use-only disclaimer for OVIpeps products — not for human consumption, medical treatment, or diagnostic use.",
};

export default async function ResearchDisclaimerPage() {
  const shortDisclaimer =
    (await getSiteSetting("research_disclaimer")) ??
    "All products are sold for research purposes only. Not for human consumption.";

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Research Disclaimer"
        description={shortDisclaimer}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Research Disclaimer" },
          ]}
          className="mb-10"
        />

        <div className="mb-10 rounded-xl border border-burgundy/20 bg-burgundy/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-burgundy">
            Important notice
          </p>
          <p className="mt-2 text-lg font-medium leading-relaxed text-navy-deep">
            {shortDisclaimer}
          </p>
        </div>

        <LegalSectionList
          sections={[
            {
              id: "purpose",
              title: "Intended use",
              content: (
                <>
                  <p>
                    OVIpeps supplies research-grade peptides and laboratory materials
                    intended exclusively for in-vitro and laboratory research conducted by
                    qualified professionals in appropriate institutional or commercial
                    research settings.
                  </p>
                  <p>
                    Our products are not drugs, medicines, food products, or cosmetics.
                    They have not been evaluated or approved by Health Canada or any
                    regulatory authority for human or veterinary therapeutic use.
                  </p>
                </>
              ),
            },
            {
              id: "prohibited",
              title: "Prohibited uses",
              content: (
                <>
                  <p>OVIpeps products must not be used for:</p>
                  <ul>
                    <li>Human consumption or self-administration</li>
                    <li>Medical, therapeutic, or diagnostic treatment</li>
                    <li>Veterinary treatment or animal consumption</li>
                    <li>Cosmetic or personal care applications</li>
                    <li>Any purpose that violates applicable laws or regulations</li>
                  </ul>
                </>
              ),
            },
            {
              id: "content",
              title: "Educational content",
              content: (
                <>
                  <p>
                    Articles, guides, and resources in our{" "}
                    <Link href="/research">Research Hub</Link> are provided for general
                    educational purposes only. They do not constitute medical advice,
                    clinical guidance, or recommendations for product use outside of
                    qualified laboratory research.
                  </p>
                  <p>
                    Researchers are responsible for ensuring their work complies with
                    institutional protocols, applicable regulations, and ethical
                    standards.
                  </p>
                </>
              ),
            },
            {
              id: "coa",
              title: "Certificates of Analysis",
              content: (
                <>
                  <p>
                    Certificates of Analysis (COAs) and batch documentation support
                    research procurement and quality review. Analytical results apply to
                    the specific batch tested and do not constitute claims about
                    safety, efficacy, or suitability for any non-research application.
                  </p>
                </>
              ),
            },
            {
              id: "responsibility",
              title: "Researcher responsibility",
              content: (
                <>
                  <p>
                    By purchasing from OVIpeps, you acknowledge that you understand the
                    research-use-only nature of our products and accept full
                    responsibility for their handling, storage, and use in accordance
                    with applicable laws and laboratory safety standards.
                  </p>
                  <p>
                    OVIpeps is not liable for misuse, improper handling, or application
                    of products contrary to this disclaimer.
                  </p>
                </>
              ),
            },
            {
              id: "questions",
              title: "Questions",
              content: (
                <>
                  <p>
                    For product documentation or order inquiries, contact{" "}
                    <a href="mailto:support@ovipeps.ca">support@ovipeps.ca</a>. For
                    medical questions, consult a qualified healthcare professional — we
                    do not provide medical advice.
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
