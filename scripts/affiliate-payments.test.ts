import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma } from "../src/generated/prisma/client";
import { recordAffiliatePayment, type AffiliatePayment } from "../src/lib/affiliate-payments";

const payment: AffiliatePayment = { paymentAmount: 80, paymentMethod: "E_TRANSFER", paidBy: "Ivo Ziedins", paidAt: new Date("2026-10-01T12:00:00Z"), paymentReference: " REF-123 " };
function fixture() {
  const items = [
    { id: "sep", payoutId: "report", affiliateId: "a", commissionIds: ["c1", "c2"], commissionOwed: 80, status: "DRAFT", paymentAmount: null },
    { id: "previous", payoutId: "old", affiliateId: "a", commissionIds: ["c0"], commissionOwed: 20, status: "PAID", paymentAmount: 20 },
  ] as Record<string, any>[];
  const commissions = [
    { id: "c1", affiliateId: "a", status: "LOCKED", commissionAmount: 30 },
    { id: "c2", affiliateId: "a", status: "LOCKED", commissionAmount: 50 },
    { id: "oct", affiliateId: "a", status: "PENDING", commissionAmount: 12 },
    { id: "c0", affiliateId: "a", status: "PAID", commissionAmount: 20 },
  ];
  const account = { pendingEarnings: 92, paidEarnings: 20, totalEarnings: 112 };
  const report = { status: "DRAFT" };
  const calls: string[] = [];
  let tail = Promise.resolve();
  async function run(id = "sep", options = payment) {
    let release = () => {};
    const tx = {
      $queryRaw: async (strings: TemplateStringsArray) => {
        calls.push(strings.join("?"));
        if (strings[0].includes('"AffiliatePayout"')) {
          const previous = tail;
          tail = new Promise<void>((resolve) => { release = resolve; });
          await previous;
        }
        return [];
      },
      affiliatePayoutItem: {
        findUnique: async ({ where }: any) => { const item = items.find((i) => i.id === where.id); return item ? { ...item } : null; },
        update: async ({ where, data }: any) => { const item = items.find((i) => i.id === where.id)!; Object.assign(item, data); return { ...item }; },
        findMany: async ({ where }: any) => items.filter((i) => i.affiliateId === where.affiliateId && i.status === where.status),
        count: async ({ where }: any) => items.filter((i) => i.payoutId === where.payoutId && i.status !== "PAID" && i.commissionOwed > 0).length,
      },
      affiliateCommission: {
        findMany: async ({ where }: any) => commissions.filter((c) => where.id.in.includes(c.id) && c.affiliateId === where.affiliateId && c.status === where.status),
        updateMany: async ({ where, data }: any) => { const rows = commissions.filter((c) => where.id.in.includes(c.id) && c.affiliateId === where.affiliateId && c.status === where.status); rows.forEach((c) => Object.assign(c, data)); return { count: rows.length }; },
        aggregate: async ({ where }: any) => ({ _sum: { commissionAmount: commissions.filter((c) => c.affiliateId === where.affiliateId && where.status.in.includes(c.status)).reduce((sum, c) => sum + c.commissionAmount, 0) } }),
      },
      affiliateAccount: { update: async ({ data }: any) => { Object.assign(account, data); return account; } },
      affiliatePayout: { update: async ({ data }: any) => { Object.assign(report, data); return report; } },
    } as unknown as Prisma.TransactionClient;
    try { return await recordAffiliatePayment(tx, id, options); } finally { release(); }
  }
  return { items, commissions, account, report, calls, run };
}

test("full payment clears only the selected period, retaining new earnings and historical totals", async () => {
  const f = fixture(); await f.run();
  assert.equal(f.items[0].status, "PAID");
  assert.equal(f.items[0].paymentReference, "REF-123");
  assert.equal(f.account.pendingEarnings, 12);
  assert.equal(f.account.paidEarnings, 100);
  assert.equal(f.account.totalEarnings, 112);
  assert.equal(f.commissions[2].status, "PENDING");
  assert.equal(f.report.status, "PAID");
  assert.equal(f.items.length, 2);
  assert.ok(f.calls.every((call) => call.includes("FOR UPDATE")));
});
test("payment resets outstanding to zero when no newer commissions exist", async () => {
  const f = fixture(); f.commissions.splice(2, 1); await f.run(); assert.equal(f.account.pendingEarnings, 0);
});
test("retry after success does not count payout twice or alter original payment", async () => {
  const f = fixture(); await f.run(); await f.run("sep", { ...payment, paymentAmount: 999, paymentReference: "OTHER" });
  assert.equal(f.account.paidEarnings, 100); assert.equal(f.items[0].paymentReference, "REF-123");
});
test("simultaneous duplicate requests record one payment", async () => {
  const f = fixture(); await Promise.all([f.run(), f.run()]); assert.equal(f.account.paidEarnings, 100); assert.equal(f.account.pendingEarnings, 12);
});
for (const amount of [40, 81, 0, NaN]) test(`rejects incorrect amount ${amount} without clearing balance`, async () => {
  const f = fixture(); await assert.rejects(f.run("sep", { ...payment, paymentAmount: amount }), /full commission/);
  assert.equal(f.account.pendingEarnings, 92); assert.equal(f.items[0].status, "DRAFT");
});
test("reversed or foreign commissions prevent settlement", async () => {
  const f = fixture(); f.commissions[0].status = "REVERSED"; await assert.rejects(f.run(), /no longer match/); assert.equal(f.items[0].status, "DRAFT");
});
test("missing commission links do not erase the balance", async () => {
  const f = fixture(); f.items[0].commissionIds = []; await assert.rejects(f.run(), /no linked commissions/); assert.equal(f.account.pendingEarnings, 92);
});
test("a monthly report remains outstanding until all affiliates are paid", async () => {
  const f = fixture(); f.items.push({ id: "other", payoutId: "report", affiliateId: "b", commissionOwed: 10, status: "DRAFT" }); await f.run(); assert.equal(f.report.status, "DRAFT");
});
test("invalid date or sender is rejected before writes", async () => {
  const f = fixture(); await assert.rejects(f.run("sep", { ...payment, paidBy: "" }), /valid payment date/); assert.equal(f.items[0].status, "DRAFT");
});

test("recorded payouts flow into ledger expense and net cash with payment-date reporting", async () => {
  const { affiliatePayoutLedgerRow } = await import("../src/lib/business-ledger");
  const item = {
    id: "paid-test", commissionOwed: 80, paymentAmount: 80,
    paidAt: payment.paidAt, paymentMethod: "E_TRANSFER", paymentReference: "REF-123", paidBy: "Ivo", notes: null,
    payout: { periodMonth: 9, periodYear: 2026 },
    affiliate: { user: { firstName: "Test", lastName: "Partner", email: "partner@example.com" } },
  } as Parameters<typeof affiliatePayoutLedgerRow>[0];
  const row = affiliatePayoutLedgerRow(item);
  assert.equal(row.expense, 80); assert.equal(row.total, -80);
  assert.equal(row.merchandise, 0); assert.equal(row.tax, 0);
  assert.equal(row.date, payment.paidAt); assert.equal(row.reference, "REF-123");
  assert.equal(row.manualId, null); assert.match(row.description, /9\/2026/);
  const legacy = affiliatePayoutLedgerRow({ ...item, paymentAmount: null });
  assert.equal(legacy.expense, 80);
});
