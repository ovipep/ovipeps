import { InventoryManager } from "@/components/admin/inventory-manager";
import { db } from "@/lib/db";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, published: true,
      variants: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, sku: true, price: true, stockQuantity: true } },
    },
  });
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Products & Inventory</h1><p className="mt-1 text-sm text-muted-foreground">Add products and vial sizes, change prices, and manage live shop inventory. Amber means 4 or fewer vials; red means sold out.</p></div>
    <InventoryManager products={products} />
  </div>;
}
