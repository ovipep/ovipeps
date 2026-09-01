import { db } from "@/lib/db";

let syncPromise: Promise<void> | null = null;

async function syncCatalog() {
  await Promise.all([
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
