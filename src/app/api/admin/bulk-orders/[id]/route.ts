import { z } from "zod";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { ensureBulkOrderSchema, isBulkOrderStatus, parseBulkOrderItems } from "@/lib/bulk-orders";
import { bulkAddressSchema, type BulkPlan } from "@/lib/bulk-checkout-schema";
import { db } from "@/lib/db";
import { buildBulkOrderDecisionEmail, sendEmail } from "@/lib/emails";
import { generateOrderNumber } from "@/lib/utils";
import { saveOrderTracking } from "@/lib/order-shipping";
import {
  getGhkcAttachment,
  getEpithalonAttachment,
  getCjcIpamorelinAttachment,
  getSs31Attachment,
  getDsipAttachment,
  getPeptideProtocolReferenceAttachment,
  isGhkcProduct,
  isEpithalonProduct,
  isCjcIpamorelinProduct,
  isSs31Product,
  isDsipProduct,
} from "@/lib/order-email-attachments";

const updateSchema = z.object({
  adminDecision: z.string().trim().max(5000).optional(),
  discountedPricing: z.string().trim().max(5000).optional(),
  eta: z.string().trim().max(500).optional(),
  status: z.string().optional(),
  manualAction: z.enum(["customer_approved", "paid", "shipped", "reconcile_products"]).optional(),
  confirmPaymentReceived: z.boolean().optional(),
  sendCustomerUpdate: z.boolean().optional(),
  shipmentTrackingNumber: z.string().trim().max(100).optional(),
  shipmentCarrier: z.string().trim().max(100).optional(),
});

async function createPaidBulkOrder(requestId: string, adminId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BulkOrderRequest" WHERE id=${requestId} FOR UPDATE`;
    const current = await tx.bulkOrderRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (current.orderId) throw new Error("This request already has a linked shop order.");
    const isCompletedBackfill = current.status === "COMPLETE" && current.paymentConfirmed;
    if (!isCompletedBackfill && !["PURCHASED", "AWAITING_PAYMENT"].includes(current.status)) {
      throw new Error("Record customer approval before marking this request paid.");
    }

    const plan = current.checkoutPlan as unknown as BulkPlan | null;
    if (!plan?.items?.length) {
      throw new Error("Prepare and save the itemized order details before marking this request paid.");
    }
    const itemTotal = plan.items.reduce((sum, item) => sum + item.totalPrice, 0);
    if (
      !Number.isFinite(plan.subtotal) ||
      !Number.isFinite(plan.shippingAmount) ||
      !Number.isFinite(plan.taxAmount) ||
      !Number.isFinite(plan.total) ||
      Math.abs(itemTotal - plan.subtotal) > 0.01 ||
      Math.abs(itemTotal + plan.shippingAmount + plan.taxAmount - plan.total) > 0.01 ||
      plan.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.unitPrice) || !Number.isFinite(item.totalPrice))
    ) {
      throw new Error("The saved order details are incomplete or inconsistent. Review the bulk order before marking it paid.");
    }

    const variantIds = [...new Set(plan.items.map((item) => item.variantId))];
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, productId: true },
    });
    if (variants.length !== variantIds.length || plan.items.some((item) => variants.find((variant) => variant.id === item.variantId)?.productId !== item.productId)) {
      throw new Error("One or more saved order items no longer match the catalog. Review the bulk order before marking it paid.");
    }

    const customer = await tx.user.findFirst({
      where: { email: { equals: current.email, mode: "insensitive" } },
      select: { id: true },
    });
    let address: unknown = null;
    let addressUserId: string | null = customer?.id ?? null;

    if (plan.addressSourceOrderNumber) {
      const sourceOrder = await tx.order.findUnique({
        where: { orderNumber: plan.addressSourceOrderNumber },
        select: { email: true, userId: true, shippingAddress: true, status: true },
      });
      if (!sourceOrder || sourceOrder.email.toLowerCase() !== current.email.toLowerCase() || ["CANCELLED", "REFUNDED"].includes(sourceOrder.status)) {
        throw new Error("The selected shipping address could not be verified for this customer.");
      }
      address = sourceOrder.shippingAddress;
      addressUserId = customer?.id ?? sourceOrder.userId;
    } else if (customer) {
      const savedAddress = await tx.address.findFirst({
        where: { userId: customer.id },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      });
      if (savedAddress) address = savedAddress;
    }

    if (!bulkAddressSchema.safeParse(address).success) {
      const priorOrders = await tx.order.findMany({
        where: { email: { equals: current.email, mode: "insensitive" }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { userId: true, shippingAddress: true },
      });
      const priorOrder = priorOrders.find((order) => bulkAddressSchema.safeParse(order.shippingAddress).success);
      if (priorOrder) {
        address = priorOrder.shippingAddress;
        addressUserId = customer?.id ?? priorOrder.userId;
      }
    }

    const parsedAddress = bulkAddressSchema.safeParse(address);
    if (!parsedAddress.success) {
      throw new Error("A confirmed shipping address is required before this paid request can become a shop order.");
    }

    const now = new Date();
    const wasAlreadyShipped = current.status === "COMPLETE";
    const paidAt = current.paymentConfirmedAt ?? now;
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: addressUserId,
        email: current.email.toLowerCase(),
        status: wasAlreadyShipped ? "COMPLETED" : "PAYMENT_RECEIVED",
        paymentMethod: "INTERAC_E_TRANSFER",
        subtotal: plan.subtotal,
        discountAmount: 0,
        shippingAmount: plan.shippingAmount,
        taxAmount: plan.taxAmount,
        total: plan.total,
        paidAt,
        ...(wasAlreadyShipped ? {
          trackingNumber: current.shipmentTrackingNumber,
          trackingCarrier: current.shipmentCarrier,
        } : {}),
        shippingAddress: { ...parsedAddress.data, deliveryMethod: "SHIPPING" } as Prisma.InputJsonValue,
        notes: `Bulk request ${current.purchaseOrderNumber ?? current.id}. ${plan.fulfillmentNote}\nCustomer decision: ${current.customerReply ?? "Recorded by administrator"}`,
        items: {
          create: plan.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            reservedQuantity: 0,
          })),
        },
        payments: {
          create: {
            amount: plan.total,
            method: "INTERAC_E_TRANSFER",
            status: "CONFIRMED",
            confirmedAt: paidAt,
            confirmedBy: adminId,
            notes: "Bulk request marked paid by administrator; inventory was not changed.",
          },
        },
        ...(wasAlreadyShipped ? {
          shipments: {
            create: {
              carrier: current.shipmentCarrier,
              trackingNumber: current.shipmentTrackingNumber,
              status: "shipped",
            },
          },
        } : {}),
      },
    });
    const updated = await tx.bulkOrderRequest.update({
      where: { id: requestId },
      data: {
        orderId: order.id,
        status: wasAlreadyShipped ? "COMPLETE" : "PENDING_SHIPMENT",
        paymentConfirmed: true,
        paymentConfirmedAt: paidAt,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "CREATE_PAID_BULK_ORDER",
        entity: "Order",
        entityId: order.id,
        details: JSON.stringify({ requestId, orderNumber: order.orderNumber, total: order.total, inventoryChanged: false, emailSent: false }),
      },
    });
    return { request: updated, orderNumber: order.orderNumber };
  }, { maxWait: 10000, timeout: 20000 });
}

async function reconcilePaidBulkOrder(requestId: string, adminId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BulkOrderRequest" WHERE id=${requestId} FOR UPDATE`;
    const current = await tx.bulkOrderRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (!current.paymentConfirmed) throw new Error("Only a bulk request already marked paid can be reconciled.");
    if (!current.orderId) throw new Error("This paid request has no linked shop order. Use Create Missing Sales Order first.");

    const plan = current.checkoutPlan as unknown as BulkPlan | null;
    if (!plan?.items?.length) throw new Error("The saved itemized order details are missing. Review the bulk order before reconciling.");
    const itemTotal = plan.items.reduce((sum, item) => sum + item.totalPrice, 0);
    if (
      !Number.isFinite(plan.subtotal) ||
      !Number.isFinite(plan.shippingAmount) ||
      !Number.isFinite(plan.taxAmount) ||
      !Number.isFinite(plan.total) ||
      Math.abs(itemTotal - plan.subtotal) > 0.01 ||
      Math.abs(itemTotal + plan.shippingAmount + plan.taxAmount - plan.total) > 0.01 ||
      plan.items.some((item) =>
        !item.productId || !item.variantId || !item.productName || !item.variantName ||
        !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.unitPrice) || !Number.isFinite(item.totalPrice)
      )
    ) {
      throw new Error("The saved order details are incomplete or inconsistent. Review the bulk order before reconciling.");
    }

    const order = await tx.order.findUnique({
      where: { id: current.orderId },
      include: { items: true },
    });
    if (!order) throw new Error("The linked shop order could not be found.");
    if (order.email.toLowerCase() !== current.email.toLowerCase()) {
      throw new Error("The linked shop order does not match this bulk-order customer.");
    }
    if (!["PAYMENT_RECEIVED", "PROCESSING", "SHIPPED", "COMPLETED"].includes(order.status)) {
      throw new Error("The linked shop order is not in a paid status.");
    }
    if (Math.abs(order.total - plan.total) > 0.01) {
      throw new Error("The saved bulk total does not match the paid order total. Review the order before changing its sales lines.");
    }

    const variantIds = [...new Set(plan.items.map((item) => item.variantId))];
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, productId: true },
    });
    if (variants.length !== variantIds.length || plan.items.some((item) =>
      variants.find((variant) => variant.id === item.variantId)?.productId !== item.productId
    )) {
      throw new Error("One or more saved items no longer match the catalog. Review the bulk order before reconciling.");
    }

    const sortItems = <T extends {
      productId: string; variantId: string; productName: string; variantName: string;
      sku: string; quantity: number; unitPrice: number; totalPrice: number;
    }>(items: T[]) => [...items].sort((a, b) =>
      a.productId.localeCompare(b.productId) || a.variantId.localeCompare(b.variantId)
    );
    const existingLines = order.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));
    const plannedLines = plan.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));
    const linesAlreadyMatch = JSON.stringify(sortItems(existingLines)) === JSON.stringify(sortItems(plannedLines));
    const paidAt = order.paidAt ?? current.paymentConfirmedAt;
    const totalsAlreadyMatch =
      Math.abs(order.subtotal - plan.subtotal) <= 0.01 &&
      Math.abs(order.discountAmount) <= 0.01 &&
      Math.abs(order.shippingAmount - plan.shippingAmount) <= 0.01 &&
      Math.abs(order.taxAmount - plan.taxAmount) <= 0.01 &&
      Math.abs(order.total - plan.total) <= 0.01 &&
      Boolean(order.paidAt);
    if (linesAlreadyMatch && totalsAlreadyMatch) {
      return {
        orderId: order.id, orderNumber: order.orderNumber, changed: false,
        itemCount: plan.items.length,
        units: plan.items.reduce((sum, item) => sum + item.quantity, 0),
        productSales: plan.subtotal,
      };
    }

    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await tx.orderItem.createMany({
      data: plan.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        reservedQuantity: 0,
      })),
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: plan.subtotal,
        discountAmount: 0,
        shippingAmount: plan.shippingAmount,
        taxAmount: plan.taxAmount,
        total: plan.total,
        ...(paidAt ? { paidAt } : {}),
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "RECONCILE_PAID_BULK_ORDER_ITEMS",
        entity: "Order",
        entityId: order.id,
        details: JSON.stringify({
          requestId,
          purchaseOrderNumber: current.purchaseOrderNumber,
          orderNumber: order.orderNumber,
          itemCount: plan.items.length,
          units: plan.items.reduce((sum, item) => sum + item.quantity, 0),
          productSales: plan.subtotal,
          inventoryChanged: false,
          emailSent: false,
        }),
      },
    });
    return {
      orderId: order.id, orderNumber: order.orderNumber, changed: true,
      itemCount: plan.items.length,
      units: plan.items.reduce((sum, item) => sum + item.quantity, 0),
      productSales: plan.subtotal,
    };
  }, { maxWait: 10000, timeout: 20000 });
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/bulk-orders/[id]">) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request update." }, { status: 400 });
  if (parsed.data.status && !isBulkOrderStatus(parsed.data.status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }
  if (
    (parsed.data.status === "PURCHASED" || parsed.data.status === "PENDING_SHIPMENT") &&
    parsed.data.confirmPaymentReceived !== true
  ) {
    return Response.json({ error: "Payment must be explicitly confirmed before moving this request to Pending Shipment." }, { status: 400 });
  }
  if (parsed.data.sendCustomerUpdate && (!parsed.data.discountedPricing || !parsed.data.eta)) {
    return Response.json({ error: "Discounted pricing and ETA are required before emailing the customer." }, { status: 400 });
  }

  await ensureBulkOrderSchema();
  const existing = await db.bulkOrderRequest.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Request not found." }, { status: 404 });

  if (parsed.data.shipmentTrackingNumber !== undefined || parsed.data.shipmentCarrier !== undefined) {
    if (!["PENDING_SHIPMENT", "COMPLETE"].includes(existing.status)) {
      return Response.json({ error: "Record payment before adding shipment tracking details." }, { status: 409 });
    }
    const trackingNumber = parsed.data.shipmentTrackingNumber ?? existing.shipmentTrackingNumber ?? "";
    if (existing.orderId && parsed.data.shipmentTrackingNumber !== undefined && trackingNumber) {
      try {
        await saveOrderTracking(existing.orderId, trackingNumber);
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Could not save tracking on the linked order." }, { status: 409 });
      }
    }
    const updated = await db.bulkOrderRequest.update({
      where: { id },
      data: {
        ...(parsed.data.shipmentTrackingNumber !== undefined ? { shipmentTrackingNumber: trackingNumber || null } : {}),
        ...(parsed.data.shipmentCarrier !== undefined ? { shipmentCarrier: parsed.data.shipmentCarrier || null } : {}),
      },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "BULK_ORDER_TRACKING_SAVED",
        entity: "BulkOrderRequest",
        entityId: id,
        details: JSON.stringify({ trackingNumber: updated.shipmentTrackingNumber, carrier: updated.shipmentCarrier, emailSent: false, inventoryChanged: false }),
      },
    });
    return Response.json({ request: updated });
  }

  if (parsed.data.manualAction === "reconcile_products") {
    if (!existing.orderId) return Response.json({ error: "This request has no linked shop order. Use Create Missing Sales Order first." }, { status: 409 });
    try {
      const result = await reconcilePaidBulkOrder(id, session.user.id);
      return Response.json(result);
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Could not reconcile paid-order sales items." }, { status: 409 });
    }
  }

  if (parsed.data.manualAction) {
    if (existing.orderId) return Response.json({ error: "This request has a linked shop order. Use its linked-order actions." }, { status: 409 });
    const now = new Date();
    let data: {
      status: "PURCHASED" | "PENDING_SHIPMENT" | "COMPLETE";
      purchaseIntentAt?: Date;
      paymentConfirmed?: boolean;
      paymentConfirmedAt?: Date;
    };
    if (parsed.data.manualAction === "customer_approved") {
      if (existing.status === "COMPLETE") return Response.json({ error: "A completed request cannot be reopened here." }, { status: 409 });
      data = { status: "PURCHASED", purchaseIntentAt: existing.purchaseIntentAt ?? now };
    } else if (parsed.data.manualAction === "paid") {
      const canBackfillCompleted = existing.status === "COMPLETE" && existing.paymentConfirmed;
      if (!canBackfillCompleted && !["PURCHASED", "AWAITING_PAYMENT"].includes(existing.status)) return Response.json({ error: "Record customer approval before marking this request paid." }, { status: 409 });
      try {
        const result = await createPaidBulkOrder(id, session.user.id);
        return Response.json(result);
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Could not create the paid shop order." }, { status: 409 });
      }
    } else {
      if (existing.status !== "PENDING_SHIPMENT") return Response.json({ error: "Mark the request paid before marking it shipped." }, { status: 409 });
      data = { status: "COMPLETE" };
    }
    const updated = await db.bulkOrderRequest.update({ where: { id }, data });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: `BULK_ORDER_MANUAL_${parsed.data.manualAction.toUpperCase()}`,
        entity: "BulkOrderRequest",
        entityId: id,
        details: JSON.stringify({ inventoryChanged: false, emailSent: false }),
      },
    });
    return Response.json({ request: updated });
  }

  if (
    parsed.data.status === "PENDING_SHIPMENT" &&
    existing.status !== "AWAITING_PAYMENT" &&
    existing.status !== "PURCHASED"
  ) {
    return Response.json({ error: "Payment Received can only be selected for a request that is awaiting e-transfer." }, { status: 409 });
  }
  if (parsed.data.status === "COMPLETE" && existing.status !== "PENDING_SHIPMENT") {
    return Response.json({ error: "Shipped can only be selected after payment has been received." }, { status: 409 });
  }
  if (
    parsed.data.status === "OPTED_OUT" &&
    ["PENDING_SHIPMENT", "COMPLETE", "PURCHASED"].includes(existing.status)
  ) {
    return Response.json({ error: "A paid or completed request cannot be opted out." }, { status: 409 });
  }

  if (parsed.data.confirmPaymentReceived || parsed.data.status === "COMPLETE" || parsed.data.status === "PENDING_SHIPMENT" || parsed.data.status === "PURCHASED") return Response.json({error:"Confirm payment and shipping on the recorded shop order, after the customer confirms their address."},{status:409});
  if (existing.orderId) return Response.json({error:"This request is linked to a shop order. Manage payment and shipping from Orders."},{status:409});
  if (parsed.data.sendCustomerUpdate && (existing.purchaseIntentAt || existing.recapApprovedAt)) return Response.json({error:"A purchase response already exists. Update and resend the itemized recap instead."},{status:409});
  const status = parsed.data.status ?? existing.status;
  const quoteIssuedAt = parsed.data.sendCustomerUpdate ? new Date() : existing.quoteIssuedAt;
  const quoteExpiresAt = parsed.data.sendCustomerUpdate
    ? new Date(quoteIssuedAt!.getTime() + 72 * 60 * 60 * 1000)
    : existing.quoteExpiresAt;
  const decisionToken = parsed.data.sendCustomerUpdate
    ? randomBytes(32).toString("hex")
    : existing.decisionToken;
  const paymentIsConfirmed = ["PENDING_SHIPMENT", "COMPLETE", "PURCHASED"].includes(status);
  let updated = await db.bulkOrderRequest.update({
    where: { id },
    data: {
      adminDecision: parsed.data.adminDecision ?? existing.adminDecision,
      discountedPricing: parsed.data.discountedPricing ?? existing.discountedPricing,
      eta: parsed.data.eta ?? existing.eta,
      status,
      paymentConfirmed: paymentIsConfirmed,
      paymentConfirmedAt: paymentIsConfirmed
        ? existing.paymentConfirmedAt ?? new Date()
        : null,
      decisionToken,
      quoteIssuedAt,
      quoteExpiresAt,
    },
  });

  if (parsed.data.sendCustomerUpdate) {
    const decisionItems = parseBulkOrderItems(updated.items);
    const attachments = [
      await getPeptideProtocolReferenceAttachment(),
      ...(decisionItems.some((item) =>
        isGhkcProduct({ slug: item.productSlug, name: item.productName }),
      )
        ? [await getGhkcAttachment()]
        : []),
      ...(decisionItems.some((item) =>
        isEpithalonProduct({ slug: item.productSlug, name: item.productName }),
      )
        ? [await getEpithalonAttachment()]
        : []),
      ...(decisionItems.some((item) =>
        isCjcIpamorelinProduct({ slug: item.productSlug, name: item.productName }),
      )
        ? [await getCjcIpamorelinAttachment()]
        : []),
      ...(decisionItems.some((item) =>
        isSs31Product({ slug: item.productSlug, name: item.productName }),
      )
        ? [await getSs31Attachment()]
        : []),
      ...(decisionItems.some((item) =>
        isDsipProduct({ slug: item.productSlug, name: item.productName }),
      )
        ? [await getDsipAttachment()]
        : []),
    ];
    const delivery = await sendEmail(
      updated.email,
      buildBulkOrderDecisionEmail({
        firstName: updated.firstName,
        requestId: updated.id,
        discountedPricing: updated.discountedPricing!,
        eta: updated.eta!,
        adminDecision: updated.adminDecision,
        items: decisionItems,
        decisionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"}/bulk-order-response/${updated.decisionToken}`,
        quoteExpiresAt: updated.quoteExpiresAt!,
      }),
      { attachments, idempotencyKey: `bulk-decision-${updated.id}-${updated.decisionToken}` }
    );
    if (!delivery.success) {
      return Response.json({ error: "The decision was saved, but the customer email could not be sent.", saved: true }, { status: 502 });
    }
    updated = await db.bulkOrderRequest.update({
      where: { id },
      data: { customerDecisionSentAt: new Date() },
    });
  }

  return Response.json({ request: updated });
}
