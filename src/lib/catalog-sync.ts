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
      data: { imageUrl: "/images/products/bac-water.jpg" },
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

}

export function syncAvailableProducts() {
  syncPromise ??= syncCatalog().catch((error) => {
    syncPromise = null;
    throw error;
  });
  return syncPromise;
}
