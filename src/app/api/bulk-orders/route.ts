import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ensureBulkOrderSchema, type BulkOrderItem } from "@/lib/bulk-orders";
import { db } from "@/lib/db";
import {
  buildBulkOrderAdminEmail,
  buildBulkOrderReceivedEmail,
  sendEmail,
} from "@/lib/emails";

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
      { idempotencyKey: `bulk-admin-${id}` }
    ),
    sendEmail(
      parsed.data.email,
      buildBulkOrderReceivedEmail({ firstName: parsed.data.firstName, requestId: id, items }),
      { idempotencyKey: `bulk-customer-${id}` }
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
