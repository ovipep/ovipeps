import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendInventoryAlertsForVariants, updateVariantInventory } from "@/lib/inventory";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { size?: string; price?: number; stockQuantity?: number };
  const price = Number(body.price);
  const stockQuantity = Number(body.stockQuantity);
  if (!body.size?.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return NextResponse.json({ error: "Enter a vial size, valid price, and whole-number inventory" }, { status: 400 });
  }
  const variant = await updateVariantInventory({ variantId: id, name: body.size.trim(), price, stockQuantity });
  await sendInventoryAlertsForVariants([id]);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${variant.product.slug}`);
  return NextResponse.json(variant);
}
