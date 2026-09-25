import { db } from "@/lib/db";
import { FALLBACK_PRODUCTS } from "@/lib/fallback-data";

let syncPromise: Promise<void> | null = null;

const RESTOCKING_PRODUCTS = [
  {
    name: "NAD+",
    slug: "nad-plus",
    shortDescription: "Nicotinamide adenine dinucleotide research compound",
    researchCategory: "Metabolic Research",
    imageUrl: "/images/products/nad-plus.jpg",
  },
  {
    name: "BPC-157",
    slug: "bpc-157",
    shortDescription: "Laboratory peptide for tissue research",
    researchCategory: "Recovery Research",
    imageUrl: "/images/products/bpc-157.jpg",
  },
  {
    name: "Tesamorelin",
    slug: "tesamorelin",
    shortDescription: "Peptide compound for laboratory research",
    researchCategory: "Peptide Research",
    imageUrl: "/images/products/tesamorelin.jpg",
  },
  {
    name: "TB-500",
    slug: "tb-500",
    shortDescription: "Laboratory peptide for recovery research",
    researchCategory: "Recovery Research",
    imageUrl: "/images/products/tb-500.jpg",
  },
  {
    name: "SS-31",
    slug: "ss-31",
    shortDescription: "Mitochondrial peptide research compound",
    researchCategory: "Mitochondrial Research",
    imageUrl: "/images/products/ss-31.jpg",
  },
  {
    name: "Semax",
    slug: "semax",
    shortDescription: "Peptide compound for laboratory research",
    researchCategory: "Peptide Research",
    imageUrl: "/images/products/semax.jpg",
  },
  {
    name: "Selank",
    slug: "selank",
    shortDescription: "Peptide compound for laboratory research",
    researchCategory: "Peptide Research",
    imageUrl: "/images/products/selank.jpg",
  },
  {
    name: "Epithalon",
    slug: "epithalon",
    shortDescription: "Peptide compound for laboratory research",
    researchCategory: "Peptide Research",
    imageUrl: "/images/products/epithalon.jpg",
  },
] as const;

// This is intentionally a separate catalog record from the original BAC Water
// product.  The original product/SKU may already be referenced by historical
// orders, so neither its slug nor its SKU can be reused for the 30 mL listing.
const BAC_WATER_30ML_PRODUCT = {
  name: "BAC Water — 30 mL",
  slug: "bac-water-30ml",
  shortDescription: "30 mL bacteriostatic water for laboratory research use",
  researchCategory: "Supplies",
  imageUrl: "/images/products/bac-water-30ml-transparent.svg",
  sku: "BACW-30ML",
  variantName: "30 mL",
} as const;

const SYRINGE_30_PACK = {
  name: 'Disposable 1 mL/cc 30G 1/2" Syringe with Needle — Pack of 30',
  slug: "disposable-1ml-30g-half-inch-syringes-30-pack",
  shortDescription: 'Thirty individually wrapped disposable 1 mL/cc syringes with 30G, 1/2" needles.',
  description: 'Pack of 30 individually wrapped disposable syringes with needles. Capacity: 1 mL/cc. Needle gauge: 30G. Needle length: 1/2 inch.',
  imageUrl: "/images/products/syringes-1ml-30g-30-pack.png",
  sku: "1CC-30G-1-2-30PACK",
} as const;

async function syncCatalog() {
  for (const [index, product] of FALLBACK_PRODUCTS.entries()) {
    const stored = await db.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        researchCategory: product.researchCategory,
        featured: product.featured,
        isNew: product.isNew,
        published: true,
        imageUrl: product.imageUrl,
        sortOrder: product.slug === "glp-3" ? -100 : index,
      },
    });
    for (const [variantIndex, variant] of product.variants.entries()) {
      await db.productVariant.upsert({
        where: { sku: variant.sku },
        update: {},
        create: {
          productId: stored.id,
          name: variant.name,
          sku: variant.sku,
          price: variant.price,
          concentration: variant.name,
          size: variant.name,
          stockQuantity: variant.stockQuantity ?? 0,
          inStock: variant.inStock,
          isDefault: variant.isDefault ?? false,
          sortOrder: variantIndex,
        },
      });
    }
  }

  await Promise.all([
    db.product.updateMany({
      where: { slug: "glp-3" },
      data: { sortOrder: -100 },
    }),
    ...RESTOCKING_PRODUCTS.map((product, index) =>
      db.product.upsert({
        where: { slug: product.slug },
        update: {
          ...product,
          featured: false,
          isNew: false,
          published: true,
          sortOrder: 100 + index,
        },
        create: {
          ...product,
          featured: false,
          isNew: false,
          published: true,
          sortOrder: 100 + index,
        },
      })
    ),
    db.product.updateMany({
      where: { slug: "bac-water" },
      data: { imageUrl: "/images/products/bac-water.jpg", sortOrder: 998 },
    }),
    db.siteSetting.upsert({
      where: { key: "etransfer_email" },
      update: { value: "ovipeps@gmail.com" },
      create: { key: "etransfer_email", value: "ovipeps@gmail.com" },
    }),
    db.siteSetting.upsert({
      where: { key: "etransfer_instructions" },
      update: {
        value:
          "Please send your Interac e-Transfer to ovipeps@gmail.com. Include your order number in the message field. Orders are processed once payment is confirmed.",
      },
      create: {
        key: "etransfer_instructions",
        value:
          "Please send your Interac e-Transfer to ovipeps@gmail.com. Include your order number in the message field. Orders are processed once payment is confirmed.",
      },
    }),
    db.siteSetting.upsert({
      where: { key: "support_email" },
      update: { value: "ovipeps@gmail.com" },
      create: { key: "support_email", value: "ovipeps@gmail.com" },
    }),
  ]);

  // Create the new product in a hidden, unpriced state. It becomes customer
  // facing only after an administrator enters an intentional price and chooses
  // "Publish in shop" in Back Office. Upserts make this safe on every request
  // without changing later admin-entered price, inventory, or publication data.
  const bacWater30ml = await db.product.upsert({
    where: { slug: BAC_WATER_30ML_PRODUCT.slug },
    update: { imageUrl: BAC_WATER_30ML_PRODUCT.imageUrl, sortOrder: 999 },
    create: {
      name: BAC_WATER_30ML_PRODUCT.name,
      slug: BAC_WATER_30ML_PRODUCT.slug,
      shortDescription: BAC_WATER_30ML_PRODUCT.shortDescription,
      researchCategory: BAC_WATER_30ML_PRODUCT.researchCategory,
      category: "SUPPLY",
      imageUrl: BAC_WATER_30ML_PRODUCT.imageUrl,
      published: false,
      sortOrder: 999,
    },
  });
  await db.productVariant.upsert({
    where: { sku: BAC_WATER_30ML_PRODUCT.sku },
    update: {},
    create: {
      productId: bacWater30ml.id,
      name: BAC_WATER_30ML_PRODUCT.variantName,
      sku: BAC_WATER_30ML_PRODUCT.sku,
      price: 0,
      concentration: BAC_WATER_30ML_PRODUCT.variantName,
      size: BAC_WATER_30ML_PRODUCT.variantName,
      stockQuantity: 0,
      inStock: false,
      isDefault: true,
      sortOrder: 0,
    },
  });

  // Keep the price and stock under administrator control; the listing is
  // visible as Restocking until both are entered in Back Office.
  const syringePack = await db.product.upsert({
    where: { slug: SYRINGE_30_PACK.slug },
    update: {
      name: SYRINGE_30_PACK.name,
      shortDescription: SYRINGE_30_PACK.shortDescription,
      description: SYRINGE_30_PACK.description,
      researchCategory: "Supplies",
      category: "SUPPLY",
      imageUrl: SYRINGE_30_PACK.imageUrl,
      published: true,
      sortOrder: 1000,
    },
    create: {
      name: SYRINGE_30_PACK.name,
      slug: SYRINGE_30_PACK.slug,
      shortDescription: SYRINGE_30_PACK.shortDescription,
      description: SYRINGE_30_PACK.description,
      researchCategory: "Supplies",
      category: "SUPPLY",
      imageUrl: SYRINGE_30_PACK.imageUrl,
      published: true,
      sortOrder: 1000,
    },
  });
  await db.productVariant.upsert({
    where: { sku: SYRINGE_30_PACK.sku },
    update: {},
    create: {
      productId: syringePack.id,
      name: "Pack of 30",
      sku: SYRINGE_30_PACK.sku,
      price: 0,
      size: "30 syringes",
      stockQuantity: 0,
      inStock: false,
      isDefault: true,
      sortOrder: 0,
    },
  });

}

export function syncAvailableProducts() {
  syncPromise ??= syncCatalog().catch((error) => {
    syncPromise = null;
    throw error;
  });
  return syncPromise;
}
