import { test } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "../src/generated/prisma/client";
import { recordBulkOrder } from "../src/lib/bulk-checkout";
import {
  bulkPlanInputSchema,
  bulkTotals,
  type BulkPlan,
} from "../src/lib/bulk-checkout-schema";
import { buildBulkRecapEmail } from "../src/lib/emails";
import { productGuidePdf } from "../src/lib/product-guide-pdf";
import { PDFDocument } from "pdf-lib";
const address = {
  firstName: "Research",
  lastName: "Customer",
  address1: "1 Test Street",
  city: "Toronto",
  province: "ON" as const,
  postalCode: "M5V 1A1",
  country: "CA" as const,
};
const user = { id: "user-1", email: "customer@example.test" };
function fixture() {
  const items = [
    {
      productId: "bpc",
      productName: "BPC-157",
      productSlug: "bpc-157",
      category: "RESEARCH_PEPTIDE",
      variantId: "bpc10",
      variantName: "10mg",
      sku: "BPC10",
      quantity: 10,
      unitPrice: 39,
      totalPrice: 390,
    },
    {
      productId: "tb",
      productName: "TB-500",
      productSlug: "tb-500",
      category: "RESEARCH_PEPTIDE",
      variantId: "tb10",
      variantName: "10mg",
      sku: "TB10",
      quantity: 10,
      unitPrice: 42.25,
      totalPrice: 422.5,
    },
    {
      productId: "cjc",
      productName: "CJC/Ipamorelin",
      productSlug: "cjc-ipamorelin",
      category: "RESEARCH_PEPTIDE",
      variantId: "cjc10",
      variantName: "10mg",
      sku: "CJC10",
      quantity: 13,
      unitPrice: 52,
      totalPrice: 676,
    },
  ];
  const plan: BulkPlan = {
    ...bulkTotals(items, 0, 0),
    items,
    fulfillmentNote:
      "BPC now; pending kits after restock. Three CJC vials already reserved.",
    allowBackorder: true,
    existingOrderNumber: "EXISTING-ORDER",
    documents: [],
  };
  const request: any = {
    id: "request-1",
    email: user.email,
    orderId: null,
    checkoutPlan: plan,
    recapApprovedAt: new Date(),
    recapSentAt: new Date(),
    recapVersion: "version-1",
    checkoutExpiresAt: new Date(Date.now() + 3600000),
    status: "PENDING_REVIEW",
    customerReply: "Option 2 plus 3 CJC",
    purchaseOrderNumber: "BULK-PO",
  };
  let order: any = {
    id: "existing-1",
    orderNumber: "EXISTING-ORDER",
    email: user.email,
    createdAt: new Date(),
    status: "AWAITING_PAYMENT",
    items: [{ variantId: "cjc10", quantity: 3, reservedQuantity: null }],
    discountCode: null,
  };
  const variants: any = {
    bpc10: { id: "bpc10", productId: "bpc", stockQuantity: 10 },
    tb10: { id: "tb10", productId: "tb", stockQuantity: 0 },
    cjc10: { id: "cjc10", productId: "cjc", stockQuantity: 0 },
  };
  let addressCount = 0,
    updateCount = 0;
  const tx = {
    $queryRaw: async () => [],
    bulkOrderRequest: {
      findUnique: async () => request,
      update: async ({ data }: any) => Object.assign(request, data),
    },
    order: {
      findUnique: async () => order,
      findUniqueOrThrow: async () => order,
      update: async ({ data }: any) => {
        updateCount++;
        order = { ...order, ...data, items: data.items.create };
        return order;
      },
    },
    productVariant: {
      findUnique: async ({ where }: any) => variants[where.id],
      findUniqueOrThrow: async ({ where }: any) => variants[where.id],
      updateMany: async ({ where, data }: any) => {
        const v = variants[where.id];
        if (v.stockQuantity < where.stockQuantity.gte) return { count: 0 };
        v.stockQuantity -= data.stockQuantity.decrement;
        return { count: 1 };
      },
      update: async ({ where, data }: any) =>
        Object.assign(variants[where.id], data),
    },
    payment: { count: async () => 0, updateMany: async () => ({ count: 0 }) },
    orderItem: { deleteMany: async () => ({ count: 1 }) },
    address: {
      create: async () => {
        addressCount++;
        return {};
      },
    },
    auditLog: { create: async () => ({}) },
  } as unknown as Prisma.TransactionClient;
  return {
    tx,
    request,
    plan,
    variants,
    getOrder: () => order,
    getCounts: () => ({ addressCount, updateCount }),
  };
}
test("exact quoted line totals remain $1,488.50 with 13 CJC vials and free shipping", () => {
  const f = fixture();
  assert.equal(f.plan.total, 1488.5);
  assert.equal(f.plan.items[2].quantity, 13);
  assert.equal(f.plan.items[1].totalPrice, 422.5);
});
test("reconciles existing 3-vial order, reserves only available stock, and records backorders", async () => {
  const f = fixture();
  const r = await recordBulkOrder(f.tx, "token", user, address, "version-1");
  assert.equal(r.created, true);
  assert.equal(r.order.orderNumber, "EXISTING-ORDER");
  assert.equal(r.order.total, 1488.5);
  assert.equal(f.variants.bpc10.stockQuantity, 0);
  assert.equal(f.variants.cjc10.stockQuantity, 0);
  assert.equal(
    r.order.items.find((i: any) => i.variantId === "cjc10")?.reservedQuantity,
    3,
  );
  assert.equal(
    r.order.items.find((i: any) => i.variantId === "tb10")?.reservedQuantity,
    0,
  );
  assert.equal(f.request.orderId, "existing-1");
});
test("repeated checkout returns same order without another reservation or address record", async () => {
  const f = fixture();
  await recordBulkOrder(f.tx, "token", user, address, "version-1");
  const r = await recordBulkOrder(f.tx, "token", user, address, "version-1");
  assert.equal(r.created, false);
  assert.deepEqual(f.getCounts(), { addressCount: 1, updateCount: 1 });
  assert.equal(f.variants.bpc10.stockQuantity, 0);
});
for (const type of [
  "unapproved",
  "unsent",
  "expired",
  "wrong-version",
  "wrong-account",
  "paid-existing",
] as const)
  test(`rejects ${type} checkout before recording an order`, async () => {
    const f = fixture();
    let version = "version-1",
      account = user;
    if (type === "unapproved") f.request.recapApprovedAt = null;
    if (type === "unsent") f.request.recapSentAt = null;
    if (type === "expired") f.request.checkoutExpiresAt = new Date(0);
    if (type === "wrong-version") version = "other";
    if (type === "wrong-account")
      account = { ...user, email: "other@example.test" };
    if (type === "paid-existing") f.getOrder().status = "PAYMENT_RECEIVED";
    await assert.rejects(() =>
      recordBulkOrder(f.tx, "token", account, address, version),
    );
    assert.equal(f.getCounts().updateCount, 0);
    assert.equal(f.variants.bpc10.stockQuantity, 10);
  });
test("refuses shortage unless backorders were approved", async () => {
  const f = fixture();
  f.plan.allowBackorder = false;
  await assert.rejects(
    () => recordBulkOrder(f.tx, "token", user, address, "version-1"),
    /insufficient stock/,
  );
  assert.equal(f.getCounts().updateCount, 0);
});
test("rejects duplicate variants and fractional quantities", () => {
  const input = {
    items: [
      { variantId: "same", quantity: 1, lineTotal: 10 },
      { variantId: "same", quantity: 1, lineTotal: 10 },
    ],
    shippingAmount: 0,
    taxAmount: 0,
    fulfillmentNote: "Ship now",
  };
  assert.equal(bulkPlanInputSchema.safeParse(input).success, false);
  input.items = [{ variantId: "one", quantity: 1.5, lineTotal: 10 }];
  assert.equal(bulkPlanInputSchema.safeParse(input).success, false);
});
test("email contains exact total, address login, payment name, attachments, and video; escapes comments", () => {
  const f = fixture();
  const email = buildBulkRecapEmail({
    ...f.plan,
    fulfillmentNote: "<script>alert(1)</script>",
    firstName: "Research",
    reference: "BULK-PO",
    checkoutUrl: "https://example.test/bulk-order-checkout/token",
    etransferEmail: "payments@example.test",
    documents: [{ label: "Guide", filename: "guide.pdf" }],
  });
  assert.match(email.text, /TOTAL: \$1488.50 CAD/);
  assert.match(email.text, /Ivo Ziedins/);
  assert.match(email.text, /guide.pdf/);
  assert.match(email.text, /RECONSTITUTE VIDEO/);
  assert.match(email.html, /Sign in \/ Confirm shipping address/);
  assert.doesNotMatch(email.html, /<script>/);
});
test("product guides are real one-page PDFs with original proportions", async () => {
  const bytes = await productGuidePdf("cjc-ipamorelin");
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.ok(pdf.getPages()[0].getHeight() > pdf.getPages()[0].getWidth());
});
