import type { Metadata } from "next";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Retatrutide COAs",
  description: "View Retatrutide certificates of analysis for 15 mg and 10 mg vials.",
};

const certificates = [
  {
    label: "Reta 15 mg COA",
    url: "/coas/retatrutide-15mg-coa-2026-10-16.pdf",
  },
  {
    label: "Reta 10 mg COA",
    url: "/coas/retatrutide-10mg-coa-2026-08-23.pdf",
  },
];

export default function RetatrutideCoasPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-navy-deep">Retatrutide COAs</h1>
      <p className="mt-3 text-muted-foreground">
        Select a certificate of analysis. Each PDF opens in a new tab.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {certificates.map((certificate) => (
          <li key={certificate.url}>
            <a
              href={certificate.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-teal/30 bg-white p-6 font-bold text-navy-deep shadow-sm transition hover:border-teal hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
            >
              <FileText className="h-6 w-6 shrink-0 text-teal" aria-hidden="true" />
              {certificate.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
