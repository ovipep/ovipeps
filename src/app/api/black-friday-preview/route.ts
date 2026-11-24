import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyCatalogVariantPolicy } from "@/lib/catalog-status";
import { getBlackFridayOffer } from "@/lib/black-friday-sale";
import { roundMoney } from "@/lib/affiliate-program";

const previewSchema = z.object({
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(128),
    variantId: z.string().trim().min(1).max(128),
    quantity: z.number().int().min(1).max(100),
  })).max(50),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in before checking sale pricing." }, { status: 401 });
  }

  const parsed = previewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart items." }, { status: 400 });
  }

  const requested = parsed.data.items;
  const variants = await db.productVariant.findMany({
    where: {
      id: { in: requested.map((item) => item.variantId) },
      deletedAt: null,
    },
    select: {
      id: true,
      productId: true,
      sku: true,
      price: true,
      stockQuantity: true,
      product: { select: { category: true, published: true } },
    },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const cartAvailable = requested.every((item) => {
    const variant = byId.get(item.variantId);
    if (!variant || variant.productId !== item.productId || !variant.product.published) return false;
    const catalog = applyCatalogVariantPolicy(variant.sku, variant.price, variant.stockQuantity);
    return catalog.inStock && catalog.stockQuantity >= item.quantity;
  });

  let eligiblePeptideVials = 0;
  let eligibleSubtotal = 0;
  if (cartAvailable) {
    for (const item of requested) {
      const variant = byId.get(item.variantId)!;
      if (variant.product.category !== "RESEARCH_PEPTIDE") continue;
      const catalog = applyCatalogVariantPolicy(variant.sku, variant.price, variant.stockQuantity);
      eligiblePeptideVials += item.quantity;
      eligibleSubtotal += catalog.price * item.quantity;
    }
  }

  const priorPaidOrders = await db.order.count({
    where: {
      userId,
      OR: [
        { paidAt: { not: null } },
        { status: { in: ["PAYMENT_RECEIVED", "PROCESSING", "SHIPPED", "COMPLETED"] } },
      ],
    },
  });
  const offer = getBlackFridayOffer(eligiblePeptideVials, priorPaidOrders === 0);
  const discountAmount = roundMoney(eligibleSubtotal * (offer.discountRate / 100));

  return NextResponse.json({
    state: offer.state,
    eligibleVialCount: eligiblePeptideVials,
    discountRate: offer.discountRate,
    discountAmount,
    freeShipping: offer.freeShipping,
    cartAvailable,
  });
}
