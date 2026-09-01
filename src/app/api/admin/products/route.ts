import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    slug?: string;
    researchCategory?: string;
  };
  const name = body.name?.trim();
  const slug = slugify(body.slug || name || "");
  if (!name || !slug) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  try {
    const product = await db.product.create({
      data: {
        name,
        slug,
        researchCategory: body.researchCategory?.trim() || "Peptide Research",
        published: true,
      },
    });
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: message.includes("Unique constraint") ? "That product name or URL already exists" : "Could not create product" },
      { status: 400 }
    );
  }
}
