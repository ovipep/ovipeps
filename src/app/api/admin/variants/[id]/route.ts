import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInventoryAlertsForVariants } from "@/lib/inventory";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { size?: string; price?: number; stockQuantity?: number };
  const price = Number(body.price);
  const stockQuantity = Number(body.stockQuantity);
  if (!body.size?.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return NextResponse.json({ error: "Enter a vial size, valid price, and whole-number inventory" }, { status: 400 });
  }
  const variant = await db.productVariant.update({
    where: { id },
    data: { name: body.size.trim(), size: body.size.trim(), concentration: body.size.trim(), price, stockQuantity, inStock: stockQuantity > 0 },
    include: { product: { select: { slug: true } } },
  });
  await sendInventoryAlertsForVariants([id]);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${variant.product.slug}`);
  return NextResponse.json(variant);
}
