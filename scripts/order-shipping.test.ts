import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { Prisma } from "../src/generated/prisma/client";
import { updateShipment, OrderShippingError } from "../src/lib/order-shipping";
import { ShipOrderButton } from "../src/components/admin/ship-order-button";

function fixture(status = "PAYMENT_RECEIVED", trackingNumber: string | null = null) {
  let order: Record<string, unknown> | null = {
    id: "order-test", status, trackingNumber, shippedAt: null, completedAt: null,
  };
  const shipments: Record<string, unknown>[] = [];
  const calls: string[] = [];
  const tx = {
    $queryRaw: async () => { calls.push("lock"); return []; },
    order: {
      findUnique: async () => { calls.push("read"); return order ? { ...order } : null; },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push("write");
        order = { ...order, ...data };
        return { ...order };
      },
    },
    shipment: {
      create: async ({ data }: { data: Record<string, unknown> }) => { shipments.push(data); return data; },
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        shipments.forEach((shipment) => Object.assign(shipment, data));
        return { count: shipments.length };
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, shipments, calls, remove: () => { order = null; } };
}

for (const status of ["PAYMENT_RECEIVED", "PROCESSING"]) {
  test(`shipping a ${status} order saves tracking and both timestamps`, async () => {
    const f = fixture(status);
    const order = await updateShipment(f.tx, "order-test", "  TRACK-123  ", true);
    assert.equal(order.status, "COMPLETED");
    assert.equal(order.trackingNumber, "TRACK-123");
    assert.ok(order.shippedAt instanceof Date);
    assert.ok(order.completedAt instanceof Date);
    assert.equal(f.shipments.length, 1);
    assert.equal(f.shipments[0].trackingNumber, "TRACK-123");
    assert.deepEqual(f.calls, ["lock", "read", "write"]);
  });
}

test("saving tracking does not mark the order shipped", async () => {
  const f = fixture();
  const order = await updateShipment(f.tx, "order-test", "TRACK-123", false);
  assert.equal(order.status, "PAYMENT_RECEIVED");
  assert.equal(order.trackingNumber, "TRACK-123");
  assert.equal(order.shippedAt, null);
  assert.equal(f.shipments.length, 0);
});

test("shipping without a tracking field preserves previously saved tracking", async () => {
  const f = fixture("PROCESSING", "SAVED-TRACKING");
  const order = await updateShipment(f.tx, "order-test", undefined, true);
  assert.equal(order.trackingNumber, "SAVED-TRACKING");
  assert.equal(f.shipments[0].trackingNumber, "SAVED-TRACKING");
});

test("orders without tracking can still complete", async () => {
  const f = fixture();
  const order = await updateShipment(f.tx, "order-test", "", true);
  assert.equal(order.status, "COMPLETED");
  assert.equal(order.trackingNumber, null);
});

test("retrying shipped does not duplicate shipment or change original timestamps", async () => {
  const f = fixture();
  const first = await updateShipment(f.tx, "order-test", "TRACK-123", true);
  const second = await updateShipment(f.tx, "order-test", "TRACK-123", true);
  assert.equal(second.status, "COMPLETED");
  assert.equal(second.shippedAt, first.shippedAt);
  assert.equal(second.completedAt, first.completedAt);
  assert.equal(f.shipments.length, 1);
});

test("completed order tracking remains editable and synchronized", async () => {
  const f = fixture();
  await updateShipment(f.tx, "order-test", "OLD", true);
  const order = await updateShipment(f.tx, "order-test", "CORRECTED", false);
  assert.equal(order.status, "COMPLETED");
  assert.equal(order.trackingNumber, "CORRECTED");
  assert.equal(f.shipments[0].trackingNumber, "CORRECTED");
});

for (const status of ["AWAITING_PAYMENT", "CANCELLED", "REFUNDED"]) {
  test(`a ${status} order cannot be shipped or have tracking saved`, async () => {
    const f = fixture(status);
    await assert.rejects(updateShipment(f.tx, "order-test", "TRACK-123", true), OrderShippingError);
    await assert.rejects(updateShipment(f.tx, "order-test", "TRACK-123", false), OrderShippingError);
    assert.ok(!f.calls.includes("write"));
    assert.equal(f.shipments.length, 0);
  });
}

test("missing order returns a specific error without writing", async () => {
  const f = fixture();
  f.remove();
  await assert.rejects(updateShipment(f.tx, "order-test", "", true), (error: unknown) =>
    error instanceof OrderShippingError && error.status === 404);
  assert.ok(!f.calls.includes("write"));
});

test("overlong tracking is rejected before touching the database", async () => {
  const f = fixture();
  await assert.rejects(updateShipment(f.tx, "order-test", "X".repeat(101), true), OrderShippingError);
  assert.deepEqual(f.calls, []);
});

test("shipment write failure propagates to the enclosing transaction", async () => {
  const f = fixture();
  Object.assign(f.tx.shipment, { create: async () => { throw new Error("shipment write failed"); } });
  await assert.rejects(updateShipment(f.tx, "order-test", "TRACK-123", true), /shipment write failed/);
});

test("shipping form includes working native POST controls without JavaScript", () => {
  const html = renderToStaticMarkup(createElement(ShipOrderButton, {
    orderId: "order-test", initialTrackingNumber: "SAVED",
  }));
  assert.match(html, /action="\/api\/admin\/orders\/order-test\/mark-shipped"/);
  assert.match(html, /method="post"/);
  assert.match(html, /name="trackingNumber"/);
  assert.match(html, /value="SAVED"/);
  assert.match(html, /<button(?=[^>]*type="submit")(?=[^>]*name="action")(?=[^>]*value="ship")[^>]*>/);
  assert.match(html, /value="save-tracking"/);
});
