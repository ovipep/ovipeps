export function getCatalogProductName(slug: string, currentName: string) {
  if (slug === "glp-3") return "Retatrutide (GLP-3)";
  if (slug === "cjc-ipamorelin") return "CJC/Ipamorelin";
  return currentName;
}

export function applyCatalogVariantPolicy(
  _sku: string,
  currentPrice: number,
  currentStockQuantity: number
) {
  const stockQuantity = Math.max(currentStockQuantity, 0);

  return {
    price: Math.max(currentPrice, 0),
    stockQuantity,
    inStock: stockQuantity > 0,
  };
}

export const CATALOG_AVAILABILITY_MESSAGE =
  "Live availability is shown for every product and vial size in the shop.";
