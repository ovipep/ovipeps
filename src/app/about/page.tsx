import type { Metadata } from "next";
import Link from "next/link";
import {
  FileCheck,
  FlaskConical,
  MapPin,
  Microscope,
  Shield,
} from "lucide-react";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { SITE_NAME } from "@/lib/content";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about OVIpeps — a Canadian research peptide brand built on transparency, batch documentation, and responsive support for qualified laboratories.",
};

const values = [
  {
    icon: MapPin,
    title: "Canadian roots",
    description:
      "Founded to serve researchers across Canada with domestic fulfillment, local support, and clear communication in CAD.",
  },
  {
    icon: FileCheck,
    title: "Documentation first",
    description:
      "We publish batch-level COAs where available and maintain a searchable Lab Results library for procurement transparency.",
  },
  {
    icon: FlaskConical,
    title: "Research integrity",
    description:
      "Every product listing clearly communicates research-use-only classification — no ambiguity about intended application.",
  },
  {
    icon: Shield,
    title: "Quality commitment",
    description:
      "Independent third-party testing supports our quality standards. We associate documentation with specific batches, not generic claims.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title={`About ${SITE_NAME}`}
        description="A Canadian research supply brand built for laboratories that value documentation, transparency, and dependable fulfillment."
      />

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "About" },
          ]}
          className="mb-10"
        />

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold text-navy-deep">
              Built for Canadian researchers
            </h2>
            <div className="prose-ovipeps mt-6">
              <p>
                OVIpeps was founded with a straightforward mission: provide qualified
                laboratories and research professionals in Canada with access to
                research-grade peptides backed by clear documentation, honest product
                communication, and responsive domestic support.
              </p>
              <p>
                We recognized a gap in the market for a supplier that prioritizes
                transparency over hype — where batch records matter, where COAs are
                accessible rather than hidden behind request forms, and where every
                product page states plainly that materials are for laboratory research
                only.
              </p>
              <p>
                From our fulfillment operations in Canada to our Interac e-Transfer
                checkout designed for domestic buyers, every aspect of OVIpeps is
                shaped by the needs of Canadian research institutions, independent
                labs, and qualified procurement teams.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-navy/5 via-card to-teal/5 p-8 lg:p-10">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal/10 blur-2xl" />
            <Microscope className="relative h-10 w-10 text-teal" />
            <h3 className="relative mt-6 text-xl font-semibold text-navy-deep">
              What we believe
            </h3>
            <p className="relative mt-3 leading-relaxed text-muted-foreground">
              Research procurement should be straightforward. Researchers deserve
              suppliers who communicate clearly, document thoroughly, and respect the
              serious nature of laboratory work. That is the standard we hold ourselves
              to — every order, every batch, every conversation.
            </p>
          </div>
        </div>

        <section className="mt-20">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal">
              Our values
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-navy-deep">
              What sets us apart
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy/5 text-navy">
                  <value.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-2xl border border-border bg-muted/30 p-8 text-center lg:p-12">
          <h2 className="text-2xl font-semibold text-navy-deep">
            Ready to work with us?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Browse the catalog, review shipping and payment details, or contact our
            team with procurement questions.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/shop"
              className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-navy-deep"
            >
              Browse Catalog
            </Link>
            <Link
              href="/shipping"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Shipping
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
