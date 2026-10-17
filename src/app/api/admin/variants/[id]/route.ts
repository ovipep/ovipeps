import { db } from "@/lib/db";
import { deleteInventoryVariant, InventoryDeletionError } from "@/lib/delete-inventory-variant";
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.confirmed !== true || typeof body.sku !== 'string' || !body.sku.trim())
    return NextResponse.json({ error: 'Confirm permanent deletion of this inventory row first.' }, { status: 400 });
  try {
    const result = await db.$transaction(tx => deleteInventoryVariant(tx, id, body.sku, session.user.id));
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath(`/shop/${result.slug}`);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof InventoryDeletionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Inventory row deletion failed', error);
    return NextResponse.json({ error: 'Unable to delete this row. No deletion was saved. Please retry.' }, { status: 503 });
  }
}
