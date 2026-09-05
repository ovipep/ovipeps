"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Filter, Search, X } from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductGrid } from "@/components/products/product-grid";
import { QuickViewModal } from "@/components/products/quick-view-modal";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import {
  DEFAULT_PRODUCT_FILTERS,
  type ProductCardData,
  type ProductFilterState,
} from "@/types/product";

interface ShopCatalogProps {
  products: ProductCardData[];
  categories: string[];
  priceRange: { min: number; max: number };
  initialFilters: ProductFilterState;
  initialQuery: string;
}

const RESEARCH_SEARCH_EXAMPLES = [
  "Joint pain",
  "Fat loss",
  "Increased energy",
  "Gut health",
  "Injury recovery",
  "Skin repair",
  "Better sleep",
  "Memory and focus",
] as const;

function filtersToSearchParams(
  filters: ProductFilterState,
  query: string,
  category?: string,
  filter?: string
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (filter) params.set("filter", filter);
  if (category) params.set("category", category);
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.categories.length > 0) params.set("categories", filters.categories.join(","));
  if (filters.priceMin != null) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax != null) params.set("priceMax", String(filters.priceMax));
  if (filters.availability !== "all") params.set("availability", filters.availability);
  if (filters.coaOnly) params.set("coaOnly", "true");
  return params;
}

export function ShopCatalog({
  products,
  categories,
  priceRange,
  initialFilters,
  initialQuery,
}: ShopCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<ProductFilterState>(initialFilters);
  const [query, setQuery] = useState(initialQuery);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductCardData | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const pushFilters = useCallback(
    (nextFilters: ProductFilterState, nextQuery = query) => {
      const params = filtersToSearchParams(
        nextFilters,
        nextQuery,
        searchParams.get("category") ?? undefined,
        searchParams.get("filter") ?? undefined
      );
      const qs = params.toString();
      startTransition(() => router.push(qs ? `/shop?${qs}` : "/shop"));
    },
    [query, router, searchParams]
  );

  const handleFiltersChange = (nextFilters: ProductFilterState) => {
    setFilters(nextFilters);
    pushFilters(nextFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushFilters(filters, query);
  };

  return (
    <>
      <ScrollReveal delay={0.1}>
        <form
          onSubmit={handleSearch}
          className="mb-8 rounded-2xl border border-sky/20 bg-gradient-to-br from-sky/5 via-card to-cyan/5 p-5 shadow-sm sm:p-6"
        >
          <label htmlFor="research-search" className="block text-base font-bold text-foreground">
            Search by research interest
          </label>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Enter an everyday goal or concern—such as joint pain, fat loss, increased energy,
            gut health, or recovery—to find compounds investigated in related research.
          </p>
          <div className="mt-4 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sky" />
              <input
                id="research-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What research area are you interested in?"
                className="w-full rounded-xl border-2 border-border/60 bg-card py-3.5 pl-12 pr-4 text-sm shadow-sm transition-all focus:border-sky/50 focus:outline-none focus:ring-4 focus:ring-sky/10"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-sky to-cyan px-6 py-3.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-sky/20"
            >
              Search research
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Popular searches:</span>
            {RESEARCH_SEARCH_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  pushFilters(filters, example);
                }}
                className="rounded-full border border-sky/25 bg-card px-3 py-1.5 text-xs font-semibold text-sky transition-colors hover:border-sky/50 hover:bg-sky/10"
              >
                {example}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Search results reflect areas investigated in research and are provided for educational
            purposes only. They are not medical advice or treatment claims.
          </p>
        </form>
      </ScrollReveal>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <ProductFilters
            filters={filters}
            onChange={handleFiltersChange}
            categories={categories}
            priceRange={priceRange}
            className="sticky top-24 rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
          />
        </div>

        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block h-4 w-4 rounded-full border-2 border-sky border-t-transparent"
                  />
                  Updating...
                </span>
              ) : (
                <>
                  <span className="text-lg font-bold text-sky">{products.length}</span>{" "}
                  {products.length === 1 ? "compound" : "compounds"} found
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold lg:hidden"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {products.length > 0 ? (
            <ProductGrid>
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
              ))}
            </ProductGrid>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border-2 border-dashed border-sky/30 bg-gradient-to-br from-sky/5 to-cyan/5 px-6 py-20 text-center"
            >
              <p className="text-lg font-bold text-foreground">
                No compounds match your criteria
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your filters or search terms.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilters(DEFAULT_PRODUCT_FILTERS);
                  setQuery("");
                  startTransition(() => router.push("/shop"));
                }}
                className="mt-6 rounded-xl bg-gradient-to-r from-sky to-cyan px-6 py-2.5 text-sm font-bold text-white shadow-md"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="absolute inset-y-0 left-0 w-full max-w-sm overflow-y-auto bg-card p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Filters</h3>
              <button type="button" onClick={() => setMobileFiltersOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <ProductFilters
              filters={filters}
              onChange={(f) => { handleFiltersChange(f); setMobileFiltersOpen(false); }}
              categories={categories}
              priceRange={priceRange}
            />
          </motion.div>
        </div>
      )}

      <QuickViewModal product={quickViewProduct} open={quickViewProduct !== null} onClose={() => setQuickViewProduct(null)} />
    </>
  );
}
