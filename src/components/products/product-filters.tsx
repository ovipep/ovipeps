"use client";

import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRODUCT_FILTERS,
  type AvailabilityFilter,
  type ProductFilterState,
  type SortOption,
} from "@/types/product";

interface ProductFiltersProps {
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
  categories: string[];
  priceRange?: { min: number; max: number };
  className?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "name-desc", label: "Name: Z–A" },
  { value: "newest", label: "Newest" },
];

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: "all", label: "All Products" },
  { value: "in-stock", label: "In Stock" },
  { value: "out-of-stock", label: "Restocking" },
];

export function ProductFilters({
  filters,
  onChange,
  categories,
  priceRange,
  className,
}: ProductFiltersProps) {
  const update = (partial: Partial<ProductFilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const toggleCategory = (category: string) => {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    update({ categories: next });
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.priceMin !== null ||
    filters.priceMax !== null ||
    filters.availability !== "all" ||
    filters.coaOnly ||
    filters.sort !== "featured";

  const resetFilters = () => onChange(DEFAULT_PRODUCT_FILTERS);

  return (
    <aside
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        className
      )}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-navy" />
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-navy"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Sort */}
        <div>
          <label
            htmlFor="sort"
            className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Sort By
          </label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as SortOption })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Research Category
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = filters.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-navy bg-navy text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground"
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price range */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Price Range (CAD)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={priceRange ? String(priceRange.min) : "Min"}
              value={filters.priceMin ?? ""}
              onChange={(e) =>
                update({
                  priceMin: e.target.value ? Number(e.target.value) : null,
                })
              }
              min={priceRange?.min}
              max={priceRange?.max}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              placeholder={priceRange ? String(priceRange.max) : "Max"}
              value={filters.priceMax ?? ""}
              onChange={(e) =>
                update({
                  priceMax: e.target.value ? Number(e.target.value) : null,
                })
              }
              min={priceRange?.min}
              max={priceRange?.max}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* Availability */}
        <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Availability
            </p>
            <div className="space-y-1.5">
              {AVAILABILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <input
                    type="radio"
                    name="availability"
                    value={opt.value}
                    checked={filters.availability === opt.value}
                    onChange={() => update({ availability: opt.value })}
                    className="h-4 w-4 border-border text-navy focus:ring-ring"
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
        </div>

        {/* COA */}
        <div>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
            <input
              type="checkbox"
              checked={filters.coaOnly}
              onChange={(e) => update({ coaOnly: e.target.checked })}
              className="h-4 w-4 rounded border-border text-navy focus:ring-ring"
            />
            <span className="text-sm text-foreground">
              COA Available Only
            </span>
          </label>
        </div>
      </div>
    </aside>
  );
}
