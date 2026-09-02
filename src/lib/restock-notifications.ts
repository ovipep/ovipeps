import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { buildRestockEmail, sendEmail } from "@/lib/emails";

export type RestockDuration = "ONE_TIME" | "ONGOING";

export function normalizeRestockEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashManageToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newManageToken() {
  return randomBytes(32).toString("base64url");
}

export async function subscribeToRestocks(input: {
  email: string;
  productIds: string[];
  allInventory: boolean;
  notificationType: RestockDuration;
}) {
  const email = normalizeRestockEmail(input.email);
  const requestedIds = [...new Set(input.productIds)];
  const products = await db.product.findMany({
    where: {
      published: true,
      ...(input.allInventory ? {} : { id: { in: requestedIds } }),
    },
    select: { id: true },
  });
  if (!products.length) throw new Error("Select at least one available shop product");

  const productIds = products.map((product) => product.id);
  const token = newManageToken();
  const tokenHash = hashManageToken(token);

  const subscription = await db.$transaction(async (tx) => {
    // One active record per email and duration keeps repeated signups from
    // producing duplicate deliveries. New choices are merged into it.
    let record = await tx.restockSubscription.findFirst({
      where: { email, notificationType: input.notificationType, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (!record) {
      record = await tx.restockSubscription.create({
        data: {
          email,
          allInventory: input.allInventory,
          notificationType: input.notificationType,
          manageTokenHash: tokenHash,
        },
      });
    } else {
      record = await tx.restockSubscription.update({
        where: { id: record.id },
        data: {
          allInventory: record.allInventory || input.allInventory,
          manageTokenHash: tokenHash,
        },
      });
    }

    for (const productId of productIds) {
      await tx.restockSubscriptionProduct.upsert({
        where: { subscriptionId_productId: { subscriptionId: record.id, productId } },
        update: { active: true, completedAt: null },
        create: { subscriptionId: record.id, productId },
      });
    }

    // An ongoing selection already covers the same product; retire matching
    // one-time selections so one event cannot email the customer twice.
    if (input.notificationType === "ONGOING") {
      const oneTime = await tx.restockSubscription.findMany({
        where: { email, notificationType: "ONE_TIME", status: "ACTIVE" },
        select: { id: true },
      });
      if (oneTime.length) {
        await tx.restockSubscriptionProduct.updateMany({
          where: { subscriptionId: { in: oneTime.map((item) => item.id) }, productId: { in: productIds } },
          data: { active: false, completedAt: new Date() },
        });
      }
    }

    return record;
  });

  return { subscriptionId: subscription.id, manageToken: token };
}

export async function createRestockEvent(productId: string) {
  return db.restockEvent.create({ data: { productId } });
}

export async function deliverRestockEvent(eventId: string) {
  const event = await db.restockEvent.findUnique({
    where: { id: eventId },
    include: { product: { select: { id: true, name: true, slug: true } } },
  });
  if (!event) return;

  const subscriptions = await db.restockSubscription.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { notificationType: "ONGOING", allInventory: true },
        { products: { some: { productId: event.productId, active: true } } },
      ],
    },
    include: { products: { where: { productId: event.productId, active: true } } },
  });

  // A customer may legitimately have old records after changing duration.
  // Collapse recipients by email, preferring ongoing coverage.
  const byEmail = new Map<string, (typeof subscriptions)[number]>();
  for (const subscription of subscriptions) {
    const previous = byEmail.get(subscription.email);
    if (!previous || subscription.notificationType === "ONGOING") {
      byEmail.set(subscription.email, subscription);
    }
  }

  for (const subscription of byEmail.values()) {
    const delivery = await db.restockDelivery.upsert({
      where: { eventId_subscriptionId: { eventId, subscriptionId: subscription.id } },
      update: {},
      create: {
        eventId,
        subscriptionId: subscription.id,
        productId: event.productId,
        email: subscription.email,
      },
    });
    if (delivery.status === "SENT") continue;

    const manageToken = newManageToken();
    await db.restockSubscription.update({
      where: { id: subscription.id },
      data: { manageTokenHash: hashManageToken(manageToken) },
    });
    const result = await sendEmail(
      subscription.email,
      buildRestockEmail({
        productName: event.product.name,
        productUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"}/shop/${event.product.slug}`,
        manageUrl: subscription.notificationType === "ONGOING"
          ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"}/restock/manage?token=${manageToken}`
          : undefined,
      }),
      { idempotencyKey: `restock-${event.id}-${subscription.id}` }
    );

    if (!result.success) {
      await db.restockDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", error: result.error },
      });
      continue;
    }

    const now = new Date();
    await db.$transaction(async (tx) => {
      await tx.restockDelivery.update({
        where: { id: delivery.id },
        data: { status: "SENT", sentAt: now, providerId: result.id, error: null },
      });
      await tx.restockSubscription.update({
        where: { id: subscription.id },
        data: { lastNotificationAt: now },
      });
      await tx.restockSubscriptionProduct.updateMany({
        where: { subscriptionId: subscription.id, productId: event.productId },
        data: { lastNotifiedAt: now },
      });

      if (subscription.notificationType === "ONE_TIME") {
        await tx.restockSubscriptionProduct.updateMany({
          where: { subscriptionId: subscription.id, productId: event.productId, active: true },
          data: { active: false, completedAt: now },
        });
        const remaining = await tx.restockSubscriptionProduct.count({
          where: { subscriptionId: subscription.id, active: true },
        });
        if (remaining === 0) {
          await tx.restockSubscription.update({
            where: { id: subscription.id },
            data: { status: "COMPLETED" },
          });
        }
      }
    });
  }
}

export async function getManagedRestockSubscription(token: string) {
  return db.restockSubscription.findUnique({
    where: { manageTokenHash: hashManageToken(token) },
    include: {
      products: {
        where: { active: true },
        include: { product: { select: { id: true, name: true } } },
        orderBy: { product: { name: "asc" } },
      },
    },
  });
}

export async function unsubscribeRestock(input: { token: string; productId?: string }) {
  const subscription = await db.restockSubscription.findUnique({
    where: { manageTokenHash: hashManageToken(input.token) },
  });
  if (!subscription) throw new Error("This restock management link is invalid or expired");
  const now = new Date();
  if (input.productId) {
    await db.restockSubscriptionProduct.updateMany({
      where: { subscriptionId: subscription.id, productId: input.productId },
      data: { active: false, completedAt: now },
    });
    // All-inventory ongoing subscriptions must become product-specific before
    // one product can be excluded. Snapshot the remaining published catalog.
    if (subscription.allInventory) {
      const products = await db.product.findMany({ where: { published: true, id: { not: input.productId } }, select: { id: true } });
      await db.restockSubscription.update({ where: { id: subscription.id }, data: { allInventory: false } });
      for (const product of products) {
        await db.restockSubscriptionProduct.upsert({
          where: { subscriptionId_productId: { subscriptionId: subscription.id, productId: product.id } },
          update: { active: true, completedAt: null },
          create: { subscriptionId: subscription.id, productId: product.id },
        });
      }
    }
  } else {
    await db.restockSubscription.update({
      where: { id: subscription.id },
      data: { status: "UNSUBSCRIBED", allInventory: false },
    });
    await db.restockSubscriptionProduct.updateMany({
      where: { subscriptionId: subscription.id },
      data: { active: false, completedAt: now },
    });
  }
}
