import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Attachment } from "resend";
import type { Prisma } from "@/generated/prisma/client";
import { ensureBulkOrderSchema, type BulkOrderItem } from "@/lib/bulk-orders";
import { db } from "@/lib/db";
import {
  buildBulkOrderAdminEmail,
  buildBulkOrderReceivedEmail,
  sendEmail,
} from "@/lib/emails";
import {
  getBpc157Attachment,
  getGhkcAttachment,
  getCjcIpamorelinAttachment,
  getNadPlusAttachment,
  getMotscAttachment,
  isBpc157Product,
  isGhkcProduct,
  isCjcIpamorelinProduct,
  isNadPlusProduct,
  isMotscProduct,
} from "@/lib/order-email-attachments";

const requestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  additionalContext: z.string().trim().max(5000).optional().default(""),
  items: z.array(z.object({
    productId: z.string().min(1),
    kits: z.number().int().min(1).max(1000),
  })).min(1).max(100),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please complete all required fields and enter a valid kit quantity." }, { status: 400 });
  }

  const uniqueIds = [...new Set(parsed.data.items.map((item) => item.productId))];
  if (uniqueIds.length !== parsed.data.items.length) {
    return Response.json({ error: "Each product may only be selected once." }, { status: 400 });
  }

  const products = await db.product.findMany({
    where: { id: { in: uniqueIds }, published: true },
    select: { id: true, name: true, slug: true },
  });
  if (products.length !== uniqueIds.length) {
    return Response.json({ error: "One or more selected products are unavailable." }, { status: 400 });
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const items: BulkOrderItem[] = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      kits: item.kits,
      units: item.kits * 10,
    };
  });
  const attachments: Attachment[] = [];
  if (items.some((item) =>
    isCjcIpamorelinProduct({ slug: item.productSlug, name: item.productName }),
  )) {
    attachments.push(await getCjcIpamorelinAttachment());
  }
  if (items.some((item) =>
    isMotscProduct({ slug: item.productSlug, name: item.productName }),
  )) {
    attachments.push(await getMotscAttachment());
  }
  if (items.some((item) =>
    isNadPlusProduct({ slug: item.productSlug, name: item.productName }),
  )) {
    attachments.push(await getNadPlusAttachment());
  }
  if (items.some((item) =>
    isBpc157Product({ slug: item.productSlug, name: item.productName }),
  )) {
    attachments.push(await getBpc157Attachment());
  }
  const customerAttachments = [...attachments];
  if (items.some((item) =>
    isGhkcProduct({ slug: item.productSlug, name: item.productName }),
  )) {
    customerAttachments.push(await getGhkcAttachment());
  }

  await ensureBulkOrderSchema();
  const id = randomUUID();
  await db.bulkOrderRequest.create({
    data: {
      id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      items: items as unknown as Prisma.InputJsonValue,
      additionalContext: parsed.data.additionalContext || null,
      status: "PENDING_DECISION",
    },
  });

  const [adminDelivery, customerDelivery] = await Promise.all([
    sendEmail(
      "ovipeps@gmail.com",
      buildBulkOrderAdminEmail({ ...parsed.data, requestId: id, items }),
      { attachments: attachments.length ? attachments : undefined, idempotencyKey: `bulk-admin-${id}` }
    ),
    sendEmail(
      parsed.data.email,
      buildBulkOrderReceivedEmail({ firstName: parsed.data.firstName, requestId: id, items }),
      { attachments: customerAttachments.length ? customerAttachments : undefined, idempotencyKey: `bulk-customer-${id}` }
    ),
  ]);

  if (!adminDelivery.success || !customerDelivery.success) {
    console.error("Bulk order request saved, but one or more confirmation emails failed", {
      id,
      adminDelivery,
      customerDelivery,
    });
  }

  return Response.json({ id, status: "PENDING_DECISION" }, { status: 201 });
}
