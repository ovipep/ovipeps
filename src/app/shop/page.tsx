import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { Suspense } from "react";
import { PageHero } from "@/components/content/page-hero";
import { ShopCatalog } from "@/components/products/shop-catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { getProducts, getProductPriceRange, getResearchCategories, getSiteSetting } from "@/lib/products";
import { parseShopSearchParams } from "@/lib/shop-params";

export const metadata: Metadata = {
  title: "Shop Research Peptides",
  description:
    "Browse laboratory-verified research peptides and supplies. Canadian fulfillment for qualified research professionals.",
};

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getPageHeading(filter?: string, category?: string, query?: string) {
  if (query?.trim()) return `Results for "${query.trim()}"`;
  if (filter === "featured") return "Featured Compounds";
  if (filter === "new") return "New Arrivals";
  if (category === "research-peptides") return "Research Peptides";
  if (category === "supplies") return "Lab Supplies";
  if (category === "bundles") return "Bundles";
  return "Product Catalog";
}

function getPageDescription(filter?: string, category?: string) {
  if (filter === "featured") return "Laboratory-verified research compounds selected for purity, consistency, and documentation.";
  if (filter === "new") return "The latest additions to our research catalog.";
  if (category === "supplies") return "Essential reconstitution and handling supplies for peptide research.";
  if (category === "bundles") return "Curated research kits combining complementary compounds.";
  return "Explore our full catalog of research peptides and laboratory supplies. All products are sold for research purposes only.";
}

async function ShopContent({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { filters, query, filter, category } = parseShopSearchParams(searchParams);
  const [products, categories, priceRange, disclaimer] = await Promise.all([
    getProducts({ ...filters, q: query, filter, category }),
    getResearchCategories(),
    getProductPriceRange(),
    getSiteSetting("research_disclaimer"),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50 via-cyan-50/70 to-white px-5 py-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
          Limited stock available now
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-emerald-950/80">
          Live prices and vial counts are shown on every product below. Products
          with zero inventory are marked Restocking.
        </p>
      </div>
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-sky/20 bg-gradient-to-r from-sky/10 via-cyan/10 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-navy-deep">Ordering 10 or more units?</p>
          <p className="mt-1 text-sm text-muted-foreground">Request discounted kit pricing and an ETA for one or more products.</p>
        </div>
        <Link href="/bulk-order-requests" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky to-cyan px-5 text-sm font-semibold text-white shadow-md shadow-sky/25 transition hover:scale-[1.02]">
          <PackagePlus className="h-4 w-4" /> Bulk Order Requests
        </Link>
      </div>
      <ShopCatalog
        products={products}
        categories={categories}
        priceRange={priceRange}
        initialFilters={filters}
        initialQuery={query}
      />
      {disclaimer && (
        <div className="mt-16 rounded-2xl border border-burgundy/20 bg-gradient-to-r from-burgundy/5 to-transparent px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-wider text-burgundy">Research Use Only</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">All products are sold for research purposes only. Not intended for human consumption.</p>
        </div>
      )}
    </div>
  );
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const { filter, category, query } = parseShopSearchParams(params);

  return (
    <>
      <PageHero
        eyebrow="Shop"
        title={getPageHeading(filter, category, query)}
        description={getPageDescription(filter, category)}
      />
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-12">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          </div>
        }
      >
        <ShopContent searchParams={params} />
      </Suspense>
    </>
  );
}
