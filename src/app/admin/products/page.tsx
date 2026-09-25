import { InventoryManager } from "@/components/admin/inventory-manager";
import { syncAvailableProducts } from "@/lib/catalog-sync";
import { db } from "@/lib/db";

export default async function AdminProductsPage() {
  await syncAvailableProducts();
  const products = await db.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, published: true,
      variants: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, sku: true, price: true, stockQuantity: true } },
    },
  });
  const inventoryProducts = products.flatMap((product) => {
    const variants = product.variants.filter((variant) => variant.sku !== "BAC-30ML");
    const hadLegacyBac30ml = variants.length !== product.variants.length;
    return hadLegacyBac30ml && variants.length === 0 ? [] : [{ ...product, variants }];
  });
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Products & Inventory</h1><p className="mt-1 text-sm text-muted-foreground">Add products and pack or vial sizes, change prices, and manage live shop inventory. Amber means 4 or fewer units; red means restocking.</p></div>
    <InventoryManager products={inventoryProducts} />
  </div>;
}
