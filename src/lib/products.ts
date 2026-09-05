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

/**
 * Curated research-topic index for the shop search. These terms describe areas
 * investigated in research; they are not treatment or health claims.
 */
const RESEARCH_TOPIC_INDEX = [
  {
    products: ["Retatrutide", "GLP-3", "Reta"],
    topics: ["metabolism", "metabolic", "energy expenditure", "appetite", "satiety", "body weight", "weight loss", "body fat", "glucose", "insulin sensitivity", "waist circumference", "lipid metabolism", "cardiovascular", "inflammation", "systemic inflammation", "fat loss", "lose weight", "weight management", "reduced appetite", "appetite control", "blood sugar", "belly fat", "more energy", "increased energy", "heart health"],
  },
  {
    products: ["CJC-1295 + Ipamorelin", "CJC/Ipamorelin", "CJC-1295", "Ipamorelin"],
    topics: ["growth hormone", "gh", "igf-1", "body composition", "lean tissue", "recovery", "tissue repair", "sleep", "fat metabolism", "protein synthesis", "fat loss", "muscle growth", "build muscle", "better sleep", "sleep quality", "injury recovery", "workout recovery", "more energy"],
  },
  {
    products: ["BPC-157"],
    topics: ["tissue repair", "healing", "tendon", "ligament", "muscle injury", "gastrointestinal", "gut protection", "angiogenesis", "inflammation", "inflammatory signalling", "wound healing", "joint pain", "sore joints", "joint recovery", "injury recovery", "sports injury", "tendon pain", "ligament injury", "gut health", "stomach health", "healing"],
  },
  {
    products: ["TB-500"],
    topics: ["tissue repair", "regeneration", "wound healing", "angiogenesis", "cell migration", "muscle recovery", "tendon recovery", "inflammation", "extracellular matrix", "remodelling", "joint pain", "sore joints", "joint recovery", "injury recovery", "sports injury", "tendon pain", "muscle soreness", "faster recovery", "healing"],
  },
  {
    products: ["Wolverine Stack", "BPC-157 / TB-500", "BPC-157 + TB-500"],
    topics: ["tissue repair", "tendon", "ligament", "muscle recovery", "wound healing", "angiogenesis", "inflammation", "cell migration", "remodelling", "joint pain", "sore joints", "joint recovery", "injury recovery", "sports injury", "tendon pain", "ligament injury", "muscle soreness", "faster recovery", "healing"],
  },
  {
    products: ["MOTS-C", "MOTS-c"],
    topics: ["mitochondrial", "mitochondria", "cellular energy", "metabolism", "glucose utilization", "glucose utilisation", "insulin sensitivity", "metabolic flexibility", "exercise", "ampk", "aging metabolism", "age-related metabolic dysfunction", "more energy", "increased energy", "energy levels", "exercise performance", "workout energy", "stamina", "endurance", "blood sugar", "healthy aging"],
  },
  {
    products: ["SS-31", "Elamipretide"],
    topics: ["mitochondrial", "mitochondria", "cardiolipin", "cellular energy", "oxidative stress", "muscle function", "cardiovascular", "aging", "age-related decline", "more energy", "increased energy", "energy levels", "muscle weakness", "stamina", "endurance", "heart health", "healthy aging"],
  },
  {
    products: ["NAD+"],
    topics: ["cellular energy", "mitochondrial", "mitochondria", "redox", "dna repair", "sirtuin", "cellular stress", "metabolism", "aging", "more energy", "increased energy", "energy levels", "brain fog", "healthy aging", "anti aging", "recovery"],
  },
  {
    products: ["GHK-Cu", "GHK-CU"],
    topics: ["skin", "connective tissue", "regeneration", "collagen", "elastin", "wound healing", "angiogenesis", "remodelling", "inflammation", "inflammatory signalling", "hair", "follicle", "skin repair", "skin health", "better skin", "wrinkles", "fine lines", "hair growth", "thinning hair", "wound care", "healing"],
  },
  {
    products: ["KPV"],
    topics: ["inflammation", "inflammatory signalling", "gut inflammation", "intestinal inflammation", "immune modulation", "skin inflammation", "epithelial barrier", "antimicrobial", "gut", "gut health", "stomach inflammation", "digestive health", "skin irritation", "skin redness", "immune health"],
  },
  {
    products: ["GLOW"],
    topics: ["skin", "tissue regeneration", "collagen", "connective tissue", "wound healing", "tissue repair", "inflammation", "inflammatory signalling", "skin quality", "recovery", "skin repair", "skin health", "better skin", "collagen support", "wound care", "healing", "inflammation"],
  },
  {
    products: ["Tesamorelin"],
    topics: ["visceral fat", "body composition", "growth hormone", "igf-1", "lipid metabolism", "liver fat", "metabolism", "body fat", "fat distribution", "fat loss", "belly fat", "abdominal fat", "waist fat", "liver health", "body recomposition", "weight management"],
  },
  {
    products: ["Selank"],
    topics: ["anxiety", "stress", "neurobiology", "gaba", "gabaergic", "cognition", "memory", "learning", "neuroplasticity", "immune signalling", "neuroimmune", "stress relief", "feeling anxious", "calm", "relaxation", "mental clarity", "focus", "better sleep"],
  },
  {
    products: ["Semax"],
    topics: ["neuroprotection", "neuroplasticity", "cognition", "memory", "learning", "bdnf", "neurotrophic", "cerebral ischemia", "oxidative stress", "neurological recovery", "brain health", "brain fog", "mental clarity", "focus", "concentration", "memory support", "learning", "stroke recovery"],
  },
  {
    products: ["Epithalon", "Epitalon"],
    topics: ["aging", "longevity", "telomere", "telomerase", "circadian", "melatonin", "oxidative stress", "cellular aging", "mitochondrial", "mitochondria", "healthy aging", "anti aging", "sleep cycle", "better sleep", "longevity", "cellular health"],
  },
  {
    products: ["5-Amino-1MQ", "5 Amino 1-Q", "5 Amino 1MQ"],
    topics: ["metabolism", "metabolic", "nnmt", "cellular energy", "adipose", "fat metabolism", "body composition", "nad+", "insulin signalling", "fat loss", "belly fat", "weight management", "body recomposition", "more energy", "increased energy", "blood sugar"],
  },
] as const;

function normalizeResearchSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getResearchProductTerms(query: string): string[] {
  const normalizedQuery = normalizeResearchSearch(query);
  if (!normalizedQuery) return [];

  return [
    ...new Set(
      RESEARCH_TOPIC_INDEX.flatMap((entry) => {
        const matchesTopic = entry.topics.some((topic) => {
          const normalizedTopic = normalizeResearchSearch(topic);
          return normalizedTopic.includes(normalizedQuery) || normalizedQuery.includes(normalizedTopic);
        });
        const matchesProduct = entry.products.some((product) =>
          normalizeResearchSearch(product).includes(normalizedQuery)
        );
        return matchesTopic || matchesProduct ? [...entry.products] : [];
      })
    ),
  ];
}


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
    const researchProductTerms = getResearchProductTerms(q);
    where.OR = [
      { name: { contains: q } },
      { shortDescription: { contains: q } },
      { researchCategory: { contains: q } },
      { description: { contains: q } },
      ...researchProductTerms.map((productName) => ({
        name: { contains: productName },
      })),
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
    const researchProductTerms = getResearchProductTerms(q).map(normalizeResearchSearch);
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.researchCategory?.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q) ||
        researchProductTerms.some((productName) => {
          const searchableProduct = normalizeResearchSearch(`${p.name} ${p.slug}`);
          return searchableProduct.includes(productName) || productName.includes(searchableProduct);
        })
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
