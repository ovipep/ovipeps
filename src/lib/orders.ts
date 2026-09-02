import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { syncAvailableProducts } from "@/lib/catalog-sync";
import {
  attributeOrder,
  createCommission,
  resolveActiveAffiliate,
} from "@/lib/affiliate";
import {
  AFFILIATE_CUSTOMER_DISCOUNT_RATE,
  roundMoney,
} from "@/lib/affiliate-program";
import {
  applyCatalogVariantPolicy,
  getCatalogProductName,
} from "@/lib/catalog-status";
import { generateOrderNumber } from "@/lib/utils";
import { buildEmailTemplate, sendEmail } from "@/lib/emails";
import {
  getOrderConfirmationAttachments,
  isRetatrutideOrderItem,
} from "@/lib/order-email-attachments";

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CreateOrderItem {
  productId: string;
  variantId: string;
  sku?: string;
  quantity: number;
}

export interface CreateOrderInput {
  email: string;
  shippingAddress: ShippingAddress;
  items: CreateOrderItem[];
  discountCode?: string | null;
  affiliateCode?: string | null;
  referralCode?: string | null;
  userId?: string | null;
}

const FLAT_SHIPPING_RATE = 25;
export const UNPAID_ORDER_EXPIRY_HOURS = 72;

function unpaidOrderCutoff(now = new Date()) {
  return new Date(
    now.getTime() - UNPAID_ORDER_EXPIRY_HOURS * 60 * 60 * 1000
  );
}

async function cancelExpiredOrder(orderId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        status: "AWAITING_PAYMENT",
        createdAt: { lte: unpaidOrderCutoff(now) },
      },
      include: { items: true },
    });

    if (!order) return false;

    const cancelled = await tx.order.updateMany({
      where: {
        id: order.id,
        status: "AWAITING_PAYMENT",
        createdAt: { lte: unpaidOrderCutoff(now) },
      },
      data: { status: "CANCELLED", cancelledAt: now },
    });

    if (cancelled.count !== 1) return false;

    for (const item of order.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }

    if (order.discountCode) {
      await tx.discountCode.updateMany({
        where: { code: order.discountCode, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }

    return true;
  });
}

export async function expireUnpaidOrders(now = new Date()) {
  const expired = await db.order.findMany({
    where: {
      status: "AWAITING_PAYMENT",
      createdAt: { lte: unpaidOrderCutoff(now) },
    },
    select: { id: true },
  });

  let cancelledCount = 0;
  for (const order of expired) {
    if (await cancelExpiredOrder(order.id, now)) cancelledCount += 1;
  }

  return cancelledCount;
}

type OrderForConfirmation = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

function getOrderCustomerFirstName(order: OrderForConfirmation) {
  const address = order.shippingAddress;
  if (
    address &&
    typeof address === "object" &&
    !Array.isArray(address) &&
    typeof address.firstName === "string" &&
    address.firstName.trim()
  ) {
    return address.firstName.trim();
  }
  return "Research Customer";
}

async function sendOrderConfirmationEmail(
  order: OrderForConfirmation,
  options: { resend?: boolean; customerName?: string } = {}
) {
  const includesRetatrutide = order.items.some(isRetatrutideOrderItem);
  const eTransferSetting = await db.siteSetting.findUnique({
    where: { key: "etransfer_email" },
  });
  const attachments = await getOrderConfirmationAttachments(
    includesRetatrutide
  );
  const resendWindow = Math.floor(Date.now() / (5 * 60 * 1000));
  const idempotencyKey = options.resend
    ? `order-confirmation-resend-${order.id}-${resendWindow}`
    : `order-confirmation-${order.id}`;
  const result = await sendEmail(
    order.email,
    await buildEmailTemplate("order_confirmation", {
      orderNumber: order.orderNumber,
      total: `$${order.total.toFixed(2)} CAD`,
      name: options.customerName ?? getOrderCustomerFirstName(order),
      etransferEmail: eTransferSetting?.value ?? "ovipeps@gmail.com",
      autodepositName: "IN Z",
      items: order.items
        .map(
          (item) =>
            `${item.productName} — ${item.variantName} × ${item.quantity}: $${item.totalPrice.toFixed(2)} CAD`
        )
        .join("\n"),
    }),
    { attachments, idempotencyKey }
  );
  if (!result.success) {
    throw new Error(result.error);
  }
  console.info("Order confirmation email sent", {
    orderNumber: order.orderNumber,
    emailId: result.id,
    attachmentCount: attachments?.length ?? 0,
    includesRetatrutide,
    resend: options.resend ?? false,
  });
  return {
    id: result.id,
    attachmentCount: attachments?.length ?? 0,
    includesRetatrutide,
  };
}

export async function resendOrderConfirmation(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");
  return sendOrderConfirmationEmail(order, { resend: true });
}

async function calculateDiscount(
  code: string | null | undefined,
  subtotal: number
) {
  if (!code?.trim()) {
    return { discountAmount: 0, discountCode: null as string | null };
  }

  const discount = await db.discountCode.findFirst({
    where: {
      code: code.trim().toUpperCase(),
      active: true,
    },
  });

  if (!discount) {
    throw new Error("Invalid discount code");
  }

  const now = new Date();
  if (discount.startsAt && discount.startsAt > now) {
    throw new Error("Discount code is not yet active");
  }
  if (discount.expiresAt && discount.expiresAt < now) {
    throw new Error("Discount code has expired");
  }
  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
    throw new Error("Discount code has reached its usage limit");
  }
  if (discount.minOrderAmount && subtotal < discount.minOrderAmount) {
    throw new Error(
      `Minimum order amount of $${discount.minOrderAmount.toFixed(2)} required for this code`
    );
  }

  let discountAmount = 0;
  if (discount.type === "PERCENTAGE") {
    discountAmount = Math.round(subtotal * (discount.value / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(subtotal, discount.value);
  }

  return { discountAmount, discountCode: discount.code };
}

export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length) {
    throw new Error("Cart is empty");
  }

  try {
    await syncAvailableProducts();
  } catch (error) {
    // Checkout uses the canonical SKU policy below, so a nonessential catalog
    // refresh must not block an otherwise valid order.
    console.error("Catalog refresh during checkout failed", error);
  }

  const variantIds = input.items.map((item) => item.variantId).filter(Boolean);
  const variantSkus = input.items
    .map((item) => item.sku?.trim().toUpperCase())
    .filter((sku): sku is string => Boolean(sku));
  const variants = await db.productVariant.findMany({
    where: {
      OR: [
        ...(variantIds.length ? [{ id: { in: variantIds } }] : []),
        ...(variantSkus.length ? [{ sku: { in: variantSkus } }] : []),
      ],
    },
    include: { product: true },
  });

  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const variantsBySku = new Map(variants.map((variant) => [variant.sku, variant]));

  let subtotal = 0;
  const orderItems = input.items.map((item) => {
    const variantById = variantsById.get(item.variantId);
    const normalizedSku = item.sku?.trim().toUpperCase();
    const variant =
      variantById ??
      (normalizedSku ? variantsBySku.get(normalizedSku) : undefined);
    if (!variant) {
      throw new Error(
        "One or more cart items are no longer available. Please refresh your cart."
      );
    }
    if (variantById && variant.productId !== item.productId) {
      throw new Error("Product and variant mismatch");
    }
    const catalogVariant = applyCatalogVariantPolicy(
      variant.sku,
      variant.price,
      variant.stockQuantity
    );
    if (!catalogVariant.inStock || catalogVariant.stockQuantity < item.quantity) {
      throw new Error(`${variant.product.name} — ${variant.name} is restocking`);
    }

    const unitPrice = catalogVariant.price;
    const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
    subtotal += totalPrice;

    return {
      productId: variant.productId,
      variantId: variant.id,
      productName: getCatalogProductName(
        variant.product.slug,
        variant.product.name
      ),
      variantName: variant.name,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
    };
  });
  const submittedAffiliateCode =
    input.affiliateCode?.trim().toUpperCase() ||
    input.referralCode?.trim().toUpperCase() ||
    null;
  const affiliate = submittedAffiliateCode
    ? await resolveActiveAffiliate(submittedAffiliateCode)
    : null;
  if (submittedAffiliateCode && !affiliate) {
    throw new Error("Affiliate code not found or inactive");
  }

  const promotion = await calculateDiscount(
    input.discountCode,
    subtotal
  );
  const affiliateDiscountAmount = affiliate
    ? roundMoney(subtotal * (AFFILIATE_CUSTOMER_DISCOUNT_RATE / 100))
    : 0;
  const discountAmount = Math.min(
    subtotal,
    roundMoney(promotion.discountAmount + affiliateDiscountAmount)
  );
  const discountCode = promotion.discountCode;

  const shippingAmount = FLAT_SHIPPING_RATE;
  const taxAmount = 0;
  const total =
    Math.round((subtotal - discountAmount + shippingAmount + taxAmount) * 100) /
    100;

  const orderNumber = generateOrderNumber();

  const order = await db.$transaction(async (tx) => {
    for (const item of orderItems) {
      const reserved = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      if (reserved.count !== 1) {
        throw new Error(`${item.productName} — ${item.variantName} is restocking`);
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: input.userId ?? undefined,
        email: input.email.trim().toLowerCase(),
        status: "AWAITING_PAYMENT",
        paymentMethod: "INTERAC_E_TRANSFER",
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        total,
        discountCode: discountCode ?? undefined,
        affiliateCode: affiliate?.code,
        referralCode: input.referralCode?.trim() || undefined,
        shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (discountCode) {
      await tx.discountCode.update({
        where: { code: discountCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    return created;
  });

  try {
    const { sendInventoryAlertsForVariants } = await import("@/lib/inventory");
    await sendInventoryAlertsForVariants(orderItems.map((item) => item.variantId));
  } catch (error) {
    console.error("Inventory alert email failed", error);
  }

  try {
    if (affiliate) {
      await attributeOrder(order.id, affiliate.code);
    }
  } catch (error) {
    // Attribution is secondary and must never turn a completed order into a
    // checkout failure for the customer.
    console.error("Order affiliate attribution failed", error);
  }

  try {
    await sendOrderConfirmationEmail(order, {
      customerName: input.shippingAddress.firstName,
    });
  } catch (error) {
    // The order is valid even when the email provider is temporarily unavailable.
    console.error("Order confirmation email failed", error);
  }

  return order;
}

export async function getOrderByNumber(orderNumber: string) {
  const existing = await db.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true, createdAt: true },
  });

  if (
    existing?.status === "AWAITING_PAYMENT" &&
    existing.createdAt <= unpaidOrderCutoff()
  ) {
    await cancelExpiredOrder(existing.id);
  }

  return db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updatePaymentReference(
  orderNumber: string,
  paymentReference: string
) {
  const order = await db.order.findUnique({
    where: { orderNumber },
  });

  if (!order) return null;

  return db.order.update({
    where: { id: order.id },
    data: { paymentReference: paymentReference.trim() },
    include: {
      items: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function confirmPayment(
  orderId: string,
  options: { confirmedBy?: string; paymentReference?: string } = {}
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "AWAITING_PAYMENT") {
    throw new Error("Order is not awaiting payment");
  }

  if (order.createdAt <= unpaidOrderCutoff()) {
    await cancelExpiredOrder(order.id);
    throw new Error("Order was automatically cancelled because payment was not received within 72 hours");
  }

  const pendingPayment = order.payments.find(
    (payment) => payment.status === "PENDING"
  );

  const now = new Date();

  const updatedOrder = await db.$transaction(async (tx) => {
    const paymentData = {
      status: "CONFIRMED" as const,
      confirmedAt: now,
      confirmedBy: options.confirmedBy,
      reference: options.paymentReference ?? order.paymentReference ?? undefined,
    };

    if (pendingPayment) {
      await tx.payment.update({
        where: { id: pendingPayment.id },
        data: paymentData,
      });
    } else {
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: order.total,
          method: order.paymentMethod,
          ...paymentData,
        },
      });
    }

    const confirmed = await tx.order.updateMany({
      where: { id: orderId, status: "AWAITING_PAYMENT" },
      data: {
        status: "PAYMENT_RECEIVED",
        paidAt: now,
        paymentReference:
          options.paymentReference ?? order.paymentReference ?? undefined,
      },
    });

    if (confirmed.count !== 1) {
      throw new Error("Order is no longer awaiting payment");
    }

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
  });

  await createCommission(orderId);

  return updatedOrder;
}
