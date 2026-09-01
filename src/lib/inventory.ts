import { db } from "@/lib/db";
import { sendEmail } from "@/lib/emails";

export const LOW_STOCK_THRESHOLD = 4;

export type InventoryState = "NORMAL" | "LOW" | "OUT";

export function getInventoryState(quantity: number): InventoryState {
  if (quantity <= 0) return "OUT";
  if (quantity <= LOW_STOCK_THRESHOLD) return "LOW";
  return "NORMAL";
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
