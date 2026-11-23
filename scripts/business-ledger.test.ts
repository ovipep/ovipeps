import assert from "node:assert/strict";
import { test } from "node:test";
import { paidOrderDateFilter, PAID_ORDER_STATUSES } from "../src/lib/business-ledger";

test("sales reports use the same paid statuses and payment date window as the ledger", () => {
  const from = new Date("2026-11-01T04:00:00.000Z");
  const to = new Date("2026-12-01T04:59:59.999Z");

  assert.deepEqual(PAID_ORDER_STATUSES, ["PAYMENT_RECEIVED", "PROCESSING", "SHIPPED", "COMPLETED"]);
  assert.deepEqual(paidOrderDateFilter(from, to), {
    status: { in: ["PAYMENT_RECEIVED", "PROCESSING", "SHIPPED", "COMPLETED"] },
    OR: [
      { paidAt: { gte: from, lte: to } },
      { paidAt: null, createdAt: { gte: from, lte: to } },
    ],
  });
});
