import { db } from "@/lib/db";
import { sendEmail } from "@/lib/emails";
import { deliverRestockEvent } from "@/lib/restock-notifications";

export const LOW_STOCK_THRESHOLD = 4;

export type InventoryState = "NORMAL" | "LOW" | "OUT";

export function getInventoryState(quantity: number): InventoryState {
  if (quantity <= 0) return "OUT";
  if (quantity <= LOW_STOCK_THRESHOLD) return "LOW";
  return "NORMAL";
}

async function deliverCreatedEvent(eventId: string | null) {
  if (!eventId) return;
  try {
    await deliverRestockEvent(eventId);
  } catch (error) {
    // Inventory must still save if the email provider is temporarily unavailable.
    // The event and pending/failed delivery remain recorded for safe retry.
    console.error("Restock notification delivery failed", error);
  }
}

export async function updateVariantInventory(input: {
  variantId: string;
  name: string;
  price: number;
  stockQuantity: number;
}) {
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      select: { productId: true },
    });
    if (!existing) throw new Error("Product vial size not found");

    // Serialize inventory edits for every vial size belonging to this product.
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${existing.productId} FOR UPDATE`;
    const before = await tx.productVariant.aggregate({
      where: { productId: existing.productId },
      _sum: { stockQuantity: true },
    });
    const variant = await tx.productVariant.update({
      where: { id: input.variantId },
      data: {
        name: input.name,
        size: input.name,
        concentration: input.name,
        price: input.price,
        stockQuantity: input.stockQuantity,
        inStock: input.stockQuantity > 0,
      },
      include: { product: { select: { slug: true } } },
    });
    const after = await tx.productVariant.aggregate({
      where: { productId: existing.productId },
      _sum: { stockQuantity: true },
    });
    const wasOut = (before._sum.stockQuantity ?? 0) <= 0;
    const isAvailable = (after._sum.stockQuantity ?? 0) > 0;
    const event = wasOut && isAvailable
      ? await tx.restockEvent.create({ data: { productId: existing.productId } })
      : null;
    return { variant, eventId: event?.id ?? null };
  });
  await deliverCreatedEvent(result.eventId);
  return result.variant;
}

export async function createVariantInventory(input: {
  productId: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
}) {
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${input.productId} FOR UPDATE`;
    const before = await tx.productVariant.aggregate({ where: { productId: input.productId }, _sum: { stockQuantity: true } });
    const variant = await tx.productVariant.create({
      data: {
        productId: input.productId,
        name: input.name,
        size: input.name,
        concentration: input.name,
        sku: input.sku,
        price: input.price,
        stockQuantity: input.stockQuantity,
        inStock: input.stockQuantity > 0,
      },
    });
    const after = (before._sum.stockQuantity ?? 0) + input.stockQuantity;
    const event = (before._sum.stockQuantity ?? 0) <= 0 && after > 0
      ? await tx.restockEvent.create({ data: { productId: input.productId } })
      : null;
    return { variant, eventId: event?.id ?? null };
  });
  await deliverCreatedEvent(result.eventId);
  return result.variant;
}

function alertSettingKey(variantId: string) {
  return `inventory_alert_state_${variantId}`;
}

export async function sendInventoryAlertsForVariants(variantIds: string[]) {
  const ids = [...new Set(variantIds)];
  if (!ids.length) return;

  const variants = await db.productVariant.findMany({
    where: { id: { in: ids } },
    include: { product: { select: { name: true } } },
  });

  for (const variant of variants) {
    const state = getInventoryState(variant.stockQuantity);
    const key = alertSettingKey(variant.id);
    const previous = await db.siteSetting.findUnique({ where: { key } });

    if (previous?.value === state) continue;

    await db.siteSetting.upsert({
      where: { key },
      update: { value: state },
      create: { key, value: state },
    });

    if (state === "NORMAL") continue;

    const supportSetting = await db.siteSetting.findUnique({
      where: { key: "support_email" },
    });
    const recipient = supportSetting?.value?.trim() || "ovipeps@gmail.com";
    const restocking = state === "OUT";
    const subject = restocking
      ? `RESTOCKING: ${variant.product.name} — ${variant.name}`
      : `LOW STOCK: ${variant.product.name} — ${variant.name}`;
    const text = restocking
      ? `${variant.product.name} — ${variant.name} (${variant.sku}) is now restocking. Available inventory: 0 vials.`
      : `${variant.product.name} — ${variant.name} (${variant.sku}) has reached the low-stock level. Available inventory: ${variant.stockQuantity} vials.`;

    const result = await sendEmail(
      recipient,
      {
        subject,
        text,
        html: `<p>${text}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"}/admin/products">Open inventory management</a></p>`,
      },
      {
        idempotencyKey: `inventory-${variant.id}-${state}-${Math.floor(Date.now() / 300000)}`,
      }
    );
    if (!result.success) throw new Error(result.error);
  }
}
