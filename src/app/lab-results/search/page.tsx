import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Hash } from "lucide-react";
import { CoaSearch } from "@/components/coa/coa-search";
import { searchPublishedCoaDocuments } from "@/lib/coa";

export const metadata: Metadata = {
  title: "Batch & Lot Search | COA Library | OVIpeps",
  description:
    "Search OVIpeps certificates of analysis by batch number or lot number. Locate third-party purity documentation for your research materials.",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; batch?: string; lot?: string }>;
}

export default async function LabResultsSearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const initialQuery = params.q ?? params.batch ?? params.lot ?? "";
  const documents = await searchPublishedCoaDocuments(initialQuery);

  return (
    <>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-deep via-navy to-teal/70" />
          <div className="absolute inset-0 molecular-bg opacity-50" />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <Link
              href="/lab-results"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Back to COA library
            </Link>
            <div className="mt-6 max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-teal-light backdrop-blur-sm">
                <Hash className="size-3.5" />
                Batch / Lot Lookup
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Search by Batch or Lot
              </h1>
              <p className="mt-4 text-base leading-relaxed text-white/70">
                Enter the batch or lot identifier printed on your vial label to
                locate the matching certificate of analysis.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <CoaSearch
            documents={documents}
            initialQuery={initialQuery}
            mode="batch-lot"
            showDedicatedSearchLink={false}
          />
        </section>
    </>
  );
}
