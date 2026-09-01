import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { name?: string; published?: boolean };
  const product = await db.product.update({
    where: { id },
    data: {
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      ...(typeof body.published === "boolean" ? { published: body.published } : {}),
    },
  });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${product.slug}`);
  return NextResponse.json(product);
}
