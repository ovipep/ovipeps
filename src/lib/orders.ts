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
  getAvailableVariant,
  getCatalogProductName,
} from "@/lib/catalog-status";
import { generateOrderNumber } from "@/lib/utils";
import { buildEmailTemplate, sendEmail } from "@/lib/emails";
import {
  getOrderConfirmationAttachments,
  isRetatrutideProduct,
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
  const retatrutideProductIds = new Set(
    variants
      .filter((variant) => isRetatrutideProduct(variant.product))
      .map((variant) => variant.productId)
  );

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
      throw new Error(`${variant.product.name} — ${variant.name} is out of stock`);
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
  const includesRetatrutide = orderItems.some((item) =>
    retatrutideProductIds.has(item.productId)
  );

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
      const availableVariant = getAvailableVariant(item.sku);
      if (!availableVariant) {
        throw new Error(`${item.productName} — ${item.variantName} is out of stock`);
      }

      // Bring older database values down to the announced stock cap before
      // reserving inventory, then decrement atomically inside this transaction.
      await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stockQuantity: { gt: availableVariant.stockQuantity },
        },
        data: { stockQuantity: availableVariant.stockQuantity, inStock: true },
      });

      const reserved = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      if (reserved.count !== 1) {
        throw new Error(`${item.productName} — ${item.variantName} is out of stock`);
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
    if (affiliate) {
      await attributeOrder(order.id, affiliate.code);
    }
  } catch (error) {
    // Attribution is secondary and must never turn a completed order into a
    // checkout failure for the customer.
    console.error("Order affiliate attribution failed", error);
  }

  try {
    const eTransferSetting = await db.siteSetting.findUnique({
      where: { key: "etransfer_email" },
    });
    const attachments = await getOrderConfirmationAttachments(
      includesRetatrutide
    );
    const emailResult = await sendEmail(
      order.email,
      await buildEmailTemplate("order_confirmation", {
        orderNumber: order.orderNumber,
        total: `$${order.total.toFixed(2)} CAD`,
        name: input.shippingAddress.firstName,
        etransferEmail: eTransferSetting?.value ?? "ovipeps@gmail.com",
        autodepositName: "IN Z",
        items: order.items
          .map(
            (item) =>
              `${item.productName} — ${item.variantName} × ${item.quantity}: $${item.totalPrice.toFixed(2)} CAD`
          )
          .join("\n"),
      }),
      {
        attachments,
        idempotencyKey: `order-confirmation-${order.id}`,
      }
    );
    if (!emailResult.success) {
      throw new Error(emailResult.error);
    }
    console.info("Order confirmation email sent", {
      orderNumber: order.orderNumber,
      emailId: emailResult.id,
      attachmentCount: attachments?.length ?? 0,
      includesRetatrutide,
    });
  } catch (error) {
    // The order is valid even when the email provider is temporarily unavailable.
    console.error("Order confirmation email failed", error);
  }

  return order;
}

export async function getOrderByNumber(orderNumber: string) {
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

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAYMENT_RECEIVED",
        paidAt: now,
        paymentReference:
          options.paymentReference ?? order.paymentReference ?? undefined,
      },
      include: {
        items: true,
        payments: true,
      },
    });
  });

  await createCommission(orderId);

  return updatedOrder;
}
