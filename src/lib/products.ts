import { db } from "@/lib/db";
import { syncAvailableProducts } from "@/lib/catalog-sync";
import { FALLBACK_PRODUCTS, FALLBACK_SETTINGS } from "@/lib/fallback-data";
import {
  applyCatalogVariantPolicy,
  getCatalogProductName,
} from "@/lib/catalog-status";
import type { Prisma, ProductCategory } from "@/generated/prisma/client";
import {
  getLowestPrice,
  isProductInStock,
  type AvailabilityFilter,
  type ProductCardData,
  type ProductVariant,
  type SortOption,
} from "@/types/product";

const productCardInclude = {
  variants: { orderBy: { sortOrder: "asc" as const } },
  coaDocuments: { where: { published: true }, select: { id: true } },
} satisfies Prisma.ProductInclude;

const productDetailInclude = {
  variants: { orderBy: { sortOrder: "asc" as const } },
  batches: { orderBy: { createdAt: "desc" as const } },
  coaDocuments: {
    where: { published: true },
    orderBy: { testingDate: "desc" as const },
  },
} satisfies Prisma.ProductInclude;

export type ProductWithVariants = Prisma.ProductGetPayload<{
  include: typeof productCardInclude;
}>;

export type ProductDetail = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

export interface ProductQueryFilters {
  q?: string;
  filter?: string;
  category?: string;
  sort?: SortOption;
  categories?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  availability?: AvailabilityFilter;
  coaOnly?: boolean;
}

const CATEGORY_SLUG_MAP: Record<string, ProductCategory> = {
  "research-peptides": "RESEARCH_PEPTIDE",
  supplies: "SUPPLY",
  bundles: "BUNDLE",
};

function mapVariant(variant: ProductWithVariants["variants"][number]): ProductVariant {
  const catalogVariant = applyCatalogVariantPolicy(
    variant.sku,
    variant.price,
    variant.stockQuantity
  );
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    price: catalogVariant.price,
    inStock: catalogVariant.inStock,
    stockQuantity: catalogVariant.stockQuantity,
    isDefault: variant.isDefault,
  };
}

export function getProductCardData(product: ProductWithVariants): ProductCardData {
  return {
    id: product.id,
    name: getCatalogProductName(product.slug, product.name),
    slug: product.slug,
    imageUrl: product.imageUrl,
    researchCategory: product.researchCategory,
    shortDescription: product.shortDescription,
    hasCoa: product.coaDocuments.length > 0,
    isNew: product.isNew,
    featured: product.featured,
    variants: product.variants.map(mapVariant),
  };
}

function buildWhereClause(filters: ProductQueryFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { published: true };

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q } },
      { shortDescription: { contains: q } },
      { researchCategory: { contains: q } },
      { description: { contains: q } },
    ];
  }

  if (filters.filter === "featured") {
    where.featured = true;
  } else if (filters.filter === "new") {
    where.isNew = true;
  }

  if (filters.category && CATEGORY_SLUG_MAP[filters.category]) {
    where.category = CATEGORY_SLUG_MAP[filters.category];
  }

  if (filters.categories && filters.categories.length > 0) {
    where.researchCategory = { in: filters.categories };
  }

  return where;
}

function sortProducts(
  products: ProductCardData[],
  sort: SortOption = "featured"
): ProductCardData[] {
  const sorted = [...products];

  switch (sort) {
    case "price-asc":
      sorted.sort(
        (a, b) => getLowestPrice(a.variants) - getLowestPrice(b.variants)
      );
      break;
    case "price-desc":
      sorted.sort(
        (a, b) => getLowestPrice(b.variants) - getLowestPrice(a.variants)
      );
      break;
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "newest":
      break;
    case "featured":
    default:
      break;
  }

  return sorted.sort((a, b) => {
    const retaFirst = Number(b.slug === "glp-3") - Number(a.slug === "glp-3");
    if (retaFirst !== 0) return retaFirst;
    return Number(isProductInStock(b.variants)) - Number(isProductInStock(a.variants));
  });
}

function mapFallbackProduct(product: ProductCardData): ProductCardData {
  return {
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      ...applyCatalogVariantPolicy(
        variant.sku,
        variant.price,
        variant.stockQuantity ?? 0
      ),
    })),
  };
}

function applyPostFilters(
  products: ProductCardData[],
  filters: ProductQueryFilters
): ProductCardData[] {
  let result = products;

  if (filters.priceMin != null) {
    result = result.filter((p) => getLowestPrice(p.variants) >= filters.priceMin!);
  }

  if (filters.priceMax != null) {
    result = result.filter((p) => getLowestPrice(p.variants) <= filters.priceMax!);
  }

  if (filters.availability === "in-stock") {
    result = result.filter((p) => p.variants.some((v) => v.inStock));
  } else if (filters.availability === "out-of-stock") {
    result = result.filter((p) => !p.variants.some((v) => v.inStock));
  }

  if (filters.coaOnly) {
    result = result.filter((p) => p.hasCoa);
  }

  return result;
}

function filterFallbackProducts(filters: ProductQueryFilters): ProductCardData[] {
  let result = FALLBACK_PRODUCTS.map(mapFallbackProduct);
  if (filters.filter === "featured") result = result.filter((p) => p.featured);
  if (filters.filter === "new") result = result.filter((p) => p.isNew);
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.researchCategory?.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q)
    );
  }
  result = applyPostFilters(result, filters);
  return sortProducts(result, filters.sort ?? "featured");
}

export async function getProducts(
  filters: ProductQueryFilters = {}
): Promise<ProductCardData[]> {
  try {
    await syncAvailableProducts();
    const sort = filters.sort ?? "featured";

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      sort === "newest"
        ? [{ createdAt: "desc" }]
        : sort === "name-asc" || sort === "name-desc"
          ? [{ name: sort === "name-asc" ? "asc" : "desc" }]
          : [{ sortOrder: "asc" }, { featured: "desc" }, { name: "asc" }];

    const products = await db.product.findMany({
      where: buildWhereClause(filters),
      include: productCardInclude,
      orderBy,
    });

    const cardData = products.map(getProductCardData);
    const filtered = applyPostFilters(cardData, filters);

    return sortProducts(filtered, sort);
  } catch {
    return filterFallbackProducts(filters);
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    await syncAvailableProducts();
    const product = await db.product.findFirst({
      where: { slug, published: true },
      include: productDetailInclude,
    });
    if (product) {
      return {
        ...product,
        name: getCatalogProductName(product.slug, product.name),
        imageUrl: product.imageUrl,
        variants: product.variants.map((v) => ({
          ...v,
          ...applyCatalogVariantPolicy(v.sku, v.price, v.stockQuantity),
        })),
      };
    }
  } catch {
    // fall through to static catalog
  }

  const fallback = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
  if (!fallback) return null;

  return {
    id: fallback.id,
    name: getCatalogProductName(fallback.slug, fallback.name),
    slug: fallback.slug,
    imageUrl: fallback.imageUrl ?? null,
    researchCategory: fallback.researchCategory ?? null,
    shortDescription: fallback.shortDescription ?? null,
    description: fallback.shortDescription ?? null,
    metaTitle: null,
    metaDescription: null,
    isNew: fallback.isNew ?? false,
    featured: fallback.featured ?? false,
    published: true,
    sortOrder: 0,
    category: "RESEARCH_PEPTIDE" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: fallback.variants.map((v, i) => ({
      id: v.id,
      productId: fallback.id,
      name: v.name,
      sku: v.sku,
      price: applyCatalogVariantPolicy(
        v.sku,
        v.price,
        v.stockQuantity ?? 0
      ).price,
      compareAtPrice: null,
      concentration: null,
      size: v.name,
      stockQuantity: applyCatalogVariantPolicy(
        v.sku,
        v.price,
        v.stockQuantity ?? 0
      ).stockQuantity,
      inStock: applyCatalogVariantPolicy(
        v.sku,
        v.price,
        v.stockQuantity ?? 0
      ).inStock,
      isDefault: v.isDefault ?? i === 0,
      sortOrder: i,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    batches: [],
    coaDocuments: fallback.hasCoa
      ? [
          {
            id: `coa-${fallback.id}`,
            productId: fallback.id,
            batchNumber: "FB-001",
            documentUrl: null,
            testingDate: null,
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      : [],
  } as unknown as ProductDetail;
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  try {
    await syncAvailableProducts();
    const products = await db.product.findMany({
      where: { published: true, featured: true },
      include: productCardInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: limit,
    });
    return sortProducts(products.map(getProductCardData));
  } catch {
    return sortProducts(FALLBACK_PRODUCTS.filter((p) => p.featured).map(mapFallbackProduct)).slice(0, limit);
  }
}

export async function getRelatedProducts(
  productId: string,
  researchCategory: string | null,
  limit = 4
): Promise<ProductCardData[]> {
  try {
    const products = await db.product.findMany({
      where: {
        published: true,
        id: { not: productId },
        ...(researchCategory ? { researchCategory } : {}),
      },
      include: productCardInclude,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
      take: limit,
    });

    if (products.length > 0) return sortProducts(products.map(getProductCardData));
  } catch {
    // fall through
  }

  return sortProducts(FALLBACK_PRODUCTS.filter(
    (p) => p.id !== productId && (!researchCategory || p.researchCategory === researchCategory)
  ).map(mapFallbackProduct))
    .slice(0, limit);
}

export async function getResearchCategories(): Promise<string[]> {
  try {
    const results = await db.product.findMany({
      where: { published: true, researchCategory: { not: null } },
      select: { researchCategory: true },
      distinct: ["researchCategory"],
      orderBy: { researchCategory: "asc" },
    });
    return results.map((r) => r.researchCategory).filter((c): c is string => c !== null);
  } catch {
    return [...new Set(FALLBACK_PRODUCTS.map((p) => p.researchCategory).filter(Boolean) as string[])];
  }
}

export async function getProductPriceRange(): Promise<{ min: number; max: number }> {
  try {
    const variants = await db.productVariant.findMany({
      where: { product: { published: true } },
      select: { sku: true, price: true, stockQuantity: true },
    });
    if (variants.length === 0) return { min: 0, max: 0 };
    const prices = variants
      .map((v) => applyCatalogVariantPolicy(v.sku, v.price, v.stockQuantity).price)
      .filter((price) => price > 0);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  } catch {
    const prices = FALLBACK_PRODUCTS.flatMap((p) =>
      p.variants.map((v) => applyCatalogVariantPolicy(v.sku, v.price, v.stockQuantity ?? 0).price)
    ).filter((price) => price > 0);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
}

export async function getProductFaqs() {
  try {
    return await db.faqItem.findMany({
      where: {
        published: true,
        category: { in: ["PRODUCTS", "RESEARCH", "SHIPPING", "COA", "GENERAL"] },
      },
      orderBy: [{ sortOrder: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getSiteSetting(key: string): Promise<string | null> {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key } });
    return setting?.value ?? FALLBACK_SETTINGS[key] ?? null;
  } catch {
    return FALLBACK_SETTINGS[key] ?? null;
  }
}
