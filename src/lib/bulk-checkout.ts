import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ensureBulkOrderSchema } from "@/lib/bulk-orders";
import {
  bulkTotals,
  bulkAddressSchema,
  type BulkPlanInput,
  type BulkPlan,
  type BulkAddress,
} from "@/lib/bulk-checkout-schema";
import {
  collectBulkDocuments,
  loadBulkAttachments,
} from "@/lib/bulk-documents";
import {
  buildBulkRecapEmail,
  type EmailTemplate,
  sendEmail,
} from "@/lib/emails";
import { generateOrderNumber } from "@/lib/utils";

export class BulkCheckoutError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
const json = (value: unknown) => value as Prisma.InputJsonValue;
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca";

async function makeRecap(
  firstName: string,
  reference: string,
  token: string,
  plan: BulkPlan,
  placed = false,
) {
  const setting = await db.siteSetting.findUnique({
    where: { key: "etransfer_email" },
  });
  return buildBulkRecapEmail({
    ...plan,
    firstName,
    reference,
    placed,
    etransferEmail: setting?.value ?? "ovipeps@gmail.com",
    checkoutUrl: placed
      ? `${site()}/account/orders/${reference}`
      : `${site()}/bulk-order-checkout/${token}`,
  });
}

export async function prepareBulkRecap(
  id: string,
  input: BulkPlanInput,
  adminId: string,
) {
  await ensureBulkOrderSchema();
  const request = await db.bulkOrderRequest.findUnique({ where: { id } });
  if (!request) throw new BulkCheckoutError("Request not found", 404);
  if (request.orderId)
    throw new BulkCheckoutError(
      "An order is already recorded for this request",
    );
  if (request.status === "OPTED_OUT")
    throw new BulkCheckoutError(
      "This customer opted out. Confirm a new purchase decision before preparing an order.",
    );

  const variants = await db.productVariant.findMany({
    where: { id: { in: input.items.map((i) => i.variantId) }, deletedAt: null },
    include: { product: true },
  });
  if (variants.length !== input.items.length)
    throw new BulkCheckoutError("A selected vial size no longer exists", 400);
  if (input.existingOrderNumber) {
    const existing = await db.order.findUnique({
      where: { orderNumber: input.existingOrderNumber },
    });
    if (
      !existing ||
      existing.email.toLowerCase() !== request.email.toLowerCase() ||
      existing.status !== "AWAITING_PAYMENT"
    )
      throw new BulkCheckoutError(
        "Only an unpaid order belonging to this customer can be reconciled",
      );
    const linked = await db.bulkOrderRequest.findFirst({
      where: { orderId: existing.id },
    });
    if (linked)
      throw new BulkCheckoutError(
        "That order is already linked to a bulk request",
      );
  }
  const items = input.items.map((i) => {
    const v = variants.find((v) => v.id === i.variantId)!;
    return {
      productId: v.productId,
      productName: v.product.name,
      productSlug: v.product.slug,
      category: v.product.category,
      variantId: v.id,
      variantName: v.name,
      sku: v.sku,
      quantity: i.quantity,
      useExistingInventory: i.useExistingInventory === true,
      ...(i.additionalQuantity ? {additionalQuantity:i.additionalQuantity} : {}),
      unitPrice: i.lineTotal / i.quantity,
      totalPrice: i.lineTotal,
    };
  });
  const plan: BulkPlan = {
    ...bulkTotals(items, input.shippingAmount, input.taxAmount),
    items,
    fulfillmentNote: input.fulfillmentNote,
    allowBackorder: input.allowBackorder,
    existingOrderNumber: input.existingOrderNumber || undefined,
    supplementalDocumentKeys: input.supplementalDocumentKeys ?? [],
    documents: await collectBulkDocuments(items, input.supplementalDocumentKeys),
  };
  // Validate every required PDF before making this draft eligible for approval.
  await loadBulkAttachments(plan.documents);
  const token = request.decisionToken ?? randomBytes(32).toString("hex");
  const draft = await makeRecap(
    request.firstName,
    plan.existingOrderNumber ?? request.purchaseOrderNumber ?? request.id,
    token,
    plan,
  );
  const version = randomBytes(16).toString("hex");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BulkOrderRequest" WHERE id=${id} FOR UPDATE`;
    const current = await tx.bulkOrderRequest.findUniqueOrThrow({
      where: { id },
    });
    if (current.orderId || current.recapApprovedAt || current.recapSentAt)
      throw new BulkCheckoutError(
        "An approved recap cannot be replaced; contact the customer before changing it",
      );
    const updated = await tx.bulkOrderRequest.update({
      where: { id },
      data: {
        checkoutPlan: json(plan),
        recapDraft: json(draft),
        recapVersion: version,
        decisionToken: token,
        recapApprovedAt: null,
        recapSentAt: null,
        recapError: null,
        checkoutExpiresAt: null,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "PREPARE_BULK_RECAP",
        entity: "BulkOrderRequest",
        entityId: id,
        details: JSON.stringify({ version, total: plan.total }),
      },
    });
    return updated;
  });
}

export async function approveAndSendBulkRecap(
  id: string,
  version: string,
  adminId: string,
) {
  await ensureBulkOrderSchema();
  const request = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BulkOrderRequest" WHERE id=${id} FOR UPDATE`;
    const r = await tx.bulkOrderRequest.findUnique({ where: { id } });
    if (!r?.checkoutPlan || !r.recapDraft || r.recapVersion !== version)
      throw new BulkCheckoutError(
        "Draft changed. Review the latest draft before approving.",
      );
    if (!r.purchaseIntentAt) throw new BulkCheckoutError("Wait for the customer purchase response before approving the recap.");
    if (r.orderId)
      throw new BulkCheckoutError(
        "An order is already recorded for this request",
      );
    if (r.recapSentAt) return r;
    if (r.status === "OPTED_OUT")
      throw new BulkCheckoutError(
        "Customer opted out; this email cannot be sent",
      );
    const updated = await tx.bulkOrderRequest.update({
      where: { id },
      data: {
        recapApprovedAt: r.recapApprovedAt ?? new Date(),
        checkoutExpiresAt:
          r.checkoutExpiresAt ?? new Date(Date.now() + 72 * 3600000),
        recapError: null,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "APPROVE_BULK_RECAP",
        entity: "BulkOrderRequest",
        entityId: id,
        details: JSON.stringify({ version }),
      },
    });
    return updated;
  });
  if (request.recapSentAt) return request;
  const plan = request.checkoutPlan as unknown as BulkPlan;
  const draft = request.recapDraft as unknown as EmailTemplate;
  try {
    const attachments = await loadBulkAttachments(plan.documents);
    const delivery = await sendEmail(request.email, draft, {
      attachments,
      idempotencyKey: `bulk-recap-${id}-${version}`,
    });
    if (!delivery.success) throw new Error(delivery.error);
    const saved = await db.bulkOrderRequest.update({
      where: { id },
      data: {
        recapSentAt: new Date(),
        recapEmailId: delivery.id,
        recapError: null,
      },
    });
    if (plan.existingOrderNumber) {
      try {
        await reconcileApprovedExistingBulkOrder(id, version, adminId);
        return await db.bulkOrderRequest.findUniqueOrThrow({ where: { id } });
      } catch (error) {
        // Delivery already succeeded; never retry or label it as a failed email.
        return await db.bulkOrderRequest.update({ where: { id }, data: {
          recapError: `Recap sent. Existing order requires review: ${error instanceof BulkCheckoutError ? error.message : "Unable to apply the approved recap"}`,
        } });
      }
    }
    return saved;
  } catch (error) {
    await db.bulkOrderRequest.update({
      where: { id },
      data: {
        recapError:
          "Delivery failed. Retry the approved draft; no order has been created.",
      },
    });
    throw error;
  }
}

// Transaction seam permits concurrency/rollback tests without contacting customers.
export async function recordBulkOrder(
  tx: Prisma.TransactionClient,
  token: string,
  user: { id: string | null; email: string },
  address: BulkAddress,
  version: string,
  administratorId?: string,
) {
  if (!user.id && !administratorId) throw new BulkCheckoutError("Customer authentication is required", 403);
  if (administratorId && !(await tx.user.findFirst({ where: { id: administratorId, role: "ADMIN" }, select: { id: true } }))) throw new BulkCheckoutError("Administrator authorization is required", 403);
  await tx.$queryRaw`SELECT id FROM "BulkOrderRequest" WHERE "decisionToken"=${token} FOR UPDATE`;
  const request = await tx.bulkOrderRequest.findUnique({
    where: { decisionToken: token },
  });
  if (
    !request ||
    request.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  )
    throw new BulkCheckoutError(
      "This quote belongs to a different account",
      403,
    );
  if (request.orderId) {
    let order = await tx.order.findUniqueOrThrow({
      where: { id: request.orderId }, include: { items: true },
    });
    if (!administratorId && !order.userId) {
      if (!user.id || request.recapVersion !== version || !request.recapApprovedAt || !request.recapSentAt || order.email.toLowerCase() !== user.email.toLowerCase())
        throw new BulkCheckoutError("Review the approved recap with the matching customer account", 403);
      order = await tx.order.update({ where: { id: order.id }, data: {
        userId: user.id,
        ...(order.status === "AWAITING_PAYMENT" ? { shippingAddress: json({ ...address, deliveryMethod: "SHIPPING" }) } : {}),
      }, include: { items: true } });
      await tx.auditLog.create({ data: { userId: user.id, action: "CLAIM_BULK_ORDER", entity: "Order", entityId: order.id, details: JSON.stringify({ requestId: request.id, version }) } });
    }
    if (!administratorId && order.userId !== user.id) throw new BulkCheckoutError("This order belongs to another account", 403);
    return { order, created: false };
  }
  if (
    !request.recapApprovedAt ||
    !request.recapSentAt ||
    !request.checkoutPlan ||
    request.recapVersion !== version ||
    !request.checkoutExpiresAt ||
    request.checkoutExpiresAt.getTime() < Date.now() ||
    request.status === "OPTED_OUT"
  )
    throw new BulkCheckoutError(
      "This recap is not approved, has changed, or has expired",
    );
  const plan = request.checkoutPlan as unknown as BulkPlan;
  if (administratorId && !plan.existingOrderNumber) throw new BulkCheckoutError("An existing order is required for administrator reconciliation");
  const productIds = [...new Set(plan.items.map((i) => i.productId))].sort();
  // Inventory edits and reservation reconciliation acquire product locks in this order.
  for (const id of productIds)
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
  let existing: Prisma.OrderGetPayload<{ include: { items: true } }> | null =
    null;
  if (plan.existingOrderNumber) {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE "orderNumber"=${plan.existingOrderNumber} FOR UPDATE`;
    existing = await tx.order.findUnique({
      where: { orderNumber: plan.existingOrderNumber },
      include: { items: true },
    });
    if (
      !existing ||
      existing.email.toLowerCase() !== user.email.toLowerCase() ||
      existing.status !== "AWAITING_PAYMENT" ||
      existing.createdAt.getTime() < Date.now() - 72 * 3600000
    )
      throw new BulkCheckoutError(
        "The existing order is no longer eligible for reconciliation. Contact OVIpeps before paying.",
      );
    if (administratorId) {
      const savedAddress = bulkAddressSchema.safeParse(existing.shippingAddress);
      if (!savedAddress.success) throw new BulkCheckoutError("The customer must provide a complete shipping address first");
      address = savedAddress.data;
      user = { id: existing.userId, email: existing.email };
    }
    if (
      existing.items.some(
        (i) => !plan.items.some((p) => p.variantId === i.variantId),
      )
    )
      throw new BulkCheckoutError(
        "The existing order contains additional items. Review it before reconciliation.",
      );
    if (
      await tx.payment.count({
        where: { orderId: existing.id, status: "CONFIRMED" },
      })
    )
      throw new BulkCheckoutError(
        "Payment has already been recorded for the existing order",
      );
  }
  const lines = [];
  for (const line of [...plan.items].sort((a, b) =>
    a.variantId.localeCompare(b.variantId),
  )) {
    const v = await tx.productVariant.findUnique({
      where: { id: line.variantId },
    });
    if (!v || v.deletedAt || v.productId !== line.productId)
      throw new BulkCheckoutError("A quoted vial size is no longer available");
    const alreadyReserved =
      existing?.items
        .filter((i) => i.variantId === line.variantId)
        .reduce((n, i) => n + (i.reservedQuantity ?? i.quantity), 0) ?? 0;
    if (alreadyReserved > line.quantity)
      throw new BulkCheckoutError(
        "The existing order reserves more units than this recap. Review the quantities.",
      );
    const needed = line.quantity - alreadyReserved;
    const take = line.useExistingInventory === true
      ? Math.min(Math.max(0, v.stockQuantity), needed)
      : 0;
    if (take < needed && !plan.allowBackorder)
      throw new BulkCheckoutError(
        `${line.productName} has insufficient stock; the order was not recorded`,
      );
    const changed = await tx.productVariant.updateMany({
      where: { id: v.id, stockQuantity: { gte: take } },
      data: { stockQuantity: { decrement: take } },
    });
    if (changed.count !== 1)
      throw new BulkCheckoutError(
        "Stock changed. Please retry; no order has been recorded.",
      );
    const stock = await tx.productVariant.findUniqueOrThrow({
      where: { id: v.id },
    });
    await tx.productVariant.update({
      where: { id: v.id },
      data: { inStock: stock.stockQuantity > 0 },
    });
    lines.push({
      productId: line.productId,
      variantId: line.variantId,
      productName: line.productName,
      variantName: line.variantName,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalPrice: line.totalPrice,
      reservedQuantity: alreadyReserved + take,
    });
  }
  const data = {
    userId: user.id,
    email: request.email.toLowerCase(),
    subtotal: plan.subtotal,
    discountAmount: 0,
    shippingAmount: plan.shippingAmount,
    taxAmount: plan.taxAmount,
    total: plan.total,
    shippingAddress: json({ ...address, deliveryMethod: "SHIPPING" }),
    notes: `Bulk request ${request.id}; ${request.purchaseOrderNumber ?? ""}\n${plan.fulfillmentNote}\nCustomer decision: ${request.customerReply ?? "(no comment)"}\nBackordered units are shown on each order item.`,
    items: { create: lines },
  };
  let order;
  if (existing) {
    if (existing.discountCode)
      await tx.discountCode.updateMany({
        where: { code: existing.discountCode, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
    await tx.payment.updateMany({
      where: { orderId: existing.id, status: "PENDING" },
      data: { amount: plan.total },
    });
    order = await tx.order.update({
      where: { id: existing.id },
      data: {
        ...data,
        discountCode: null,
        affiliateCode: existing.affiliateCode,
      },
      include: { items: true },
    });
  } else
    order = await tx.order.create({
      data: {
        ...data,
        orderNumber: generateOrderNumber(),
        status: "AWAITING_PAYMENT",
        paymentMethod: "INTERAC_E_TRANSFER",
      },
      include: { items: true },
    });
  if (user.id && !administratorId) await tx.address.create({
    data: { ...address, userId: user.id, label: "Bulk order shipping" },
  });
  await tx.bulkOrderRequest.update({
    where: { id: request.id },
    data: { orderId: order.id, status: "AWAITING_PAYMENT" },
  });
  await tx.auditLog.create({
    data: {
      userId: administratorId ?? user.id,
      action: existing ? "RECONCILE_BULK_ORDER" : "CREATE_BULK_ORDER",
      entity: "Order",
      entityId: order.id,
      details: JSON.stringify({
        requestId: request.id,
        version,
        total: order.total,
        previousTotal: existing?.total,
        previousItems: existing?.items,
      }),
    },
  });
  return { order, created: true };
}

/** Apply an approved recap to its original unpaid order using the address already supplied. No email is sent. */
export async function reconcileApprovedExistingBulkOrder(id: string, version: string, administratorId: string) {
  await ensureBulkOrderSchema();
  const request = await db.bulkOrderRequest.findUniqueOrThrow({ where: { id } });
  const plan = request.checkoutPlan as unknown as BulkPlan | null;
  if (!plan?.existingOrderNumber || !request.decisionToken || request.recapVersion !== version)
    throw new BulkCheckoutError("Review the current approved recap and existing order first");
  const existing = await db.order.findUniqueOrThrow({ where: { orderNumber: plan.existingOrderNumber } });
  const address = bulkAddressSchema.safeParse(existing.shippingAddress);
  if (!address.success) throw new BulkCheckoutError("The customer must provide a complete shipping address first");
  return db.$transaction(tx => recordBulkOrder(tx, request.decisionToken!, { id: existing.userId, email: existing.email }, address.data, version, administratorId));
}

export async function completeBulkCheckout(
  token: string,
  user: { id: string; email: string },
  address: BulkAddress,
  version: string,
) {
  await ensureBulkOrderSchema();
  const result = await db.$transaction(
    (tx) => recordBulkOrder(tx, token, user, address, version),
    { maxWait: 10000, timeout: 20000 },
  );
  return result;
}

export async function sendRecordedBulkConfirmation(token: string) {
  const request = await db.bulkOrderRequest.findUniqueOrThrow({
    where: { decisionToken: token },
  });
  if (!request.orderId || !request.recapApprovedAt || !request.recapSentAt)
    throw new BulkCheckoutError("Order confirmation has not been approved");
  const order = await db.order.findUniqueOrThrow({
    where: { id: request.orderId },
    include: { items: true },
  });
  if (["CANCELLED", "REFUNDED"].includes(order.status)) throw new BulkCheckoutError("This order is cancelled or refunded. Review it before emailing payment instructions.");
  const plan = request.checkoutPlan as unknown as BulkPlan;
  const draft = await makeRecap(
    request.firstName,
    order.orderNumber,
    token,
    plan,
    true,
  );
  const delivery = await sendEmail(order.email, draft, {
    attachments: await loadBulkAttachments(plan.documents),
    idempotencyKey: `bulk-order-recorded-${request.id}-${order.id}`,
  });
  if (!delivery.success)
    throw new Error("Order recorded, but email delivery needs a retry.");
  return order;
}
