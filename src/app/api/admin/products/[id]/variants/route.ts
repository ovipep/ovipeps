import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInventoryAlertsForVariants } from "@/lib/inventory";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: productId } = await params;
  const body = (await request.json()) as { size?: string; sku?: string; price?: number; stockQuantity?: number };
  const size = body.size?.trim();
  const sku = body.sku?.trim().toUpperCase();
  const price = Number(body.price);
  const stockQuantity = Number(body.stockQuantity ?? 0);
  if (!size || !sku || !Number.isFinite(price) || price < 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return NextResponse.json({ error: "Enter a vial size, unique SKU, valid price, and whole-number inventory" }, { status: 400 });
  }
  let variant;
  try {
    variant = await db.productVariant.create({
      data: { productId, name: size, size, concentration: size, sku, price, stockQuantity, inStock: stockQuantity > 0 },
    });
  } catch {
    return NextResponse.json({ error: "That SKU already exists or the vial size could not be added" }, { status: 400 });
  }

  try {
    await sendInventoryAlertsForVariants([variant.id]);
  } catch (error) {
    console.error("New vial size saved, but inventory alert email failed", error);
  }
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return NextResponse.json(variant);
}
