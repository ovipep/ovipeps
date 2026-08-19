import type { Metadata } from "next";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { FaqAccordion } from "@/components/content/faq-accordion";
import { FAQ_CATEGORIES, FAQ_CATEGORY_LABELS } from "@/lib/content";
import { getPublishedFaqs } from "@/lib/content-data";
import type { FaqCategory } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about OVIpeps research peptides, shipping, payments, COAs, and the affiliate program.",
};

export default async function FaqPage() {
  const faqs = await getPublishedFaqs();

  const faqsByCategory = FAQ_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = faqs.filter((faq) => faq.category === category);
      return acc;
    },
    {} as Record<FaqCategory, typeof faqs>
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        eyebrow="Support"
        title="Frequently Asked Questions"
        description="Clear answers about research products, Canadian fulfillment, Interac e-Transfer payments, documentation, and our affiliate program."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Research Hub", href: "/research" },
            { label: "FAQ" },
          ]}
          className="mb-10"
        />

        <div className="space-y-12">
          {FAQ_CATEGORIES.map((category) => {
            const items = faqsByCategory[category];
            if (!items.length) return null;

            return (
              <section
                key={category}
                id={category.toLowerCase()}
                className="scroll-mt-28"
              >
                <h2 className="flex items-center gap-3 text-xl font-bold text-navy-deep">
                  <span className="h-6 w-1 rounded-full bg-gradient-to-b from-sky to-cyan" />
                  {FAQ_CATEGORY_LABELS[category]}
                </h2>
                <div className="mt-4 overflow-hidden rounded-2xl border border-sky/10 bg-gradient-to-br from-card to-sky/5 px-5 shadow-lg shadow-sky/5">
                  {items.map((faq) => (
                    <FaqAccordion
                      key={faq.question}
                      question={faq.question}
                      answer={faq.answer}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
