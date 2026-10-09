import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "../src/generated/prisma/client";
import { buildAffiliatePayoutHistory } from "../src/lib/affiliate-payout-history";
import { saveAffiliatePayoutEmail } from "../src/lib/affiliate-payout-email";

type Record = Parameters<typeof buildAffiliatePayoutHistory>[0][number];
function payout(id: string, amount: number, status = "PAID", date = "2026-09-30") : Record {
  return { id, payout: { periodYear: 2026, periodMonth: 9 }, grossSales: amount * 10,
    commissionOwed: amount, paymentAmount: amount, paymentMethod: "E_TRANSFER",
    paymentReference: `ref-${id}`, status, paidAt: status === "PAID" ? new Date(`${date}T12:00:00Z`) : null,
    createdAt: new Date(`${date}T00:00:00Z`) };
}
test("running payment totals follow payment dates and exclude unpaid reports", () => {
  const rows = buildAffiliatePayoutHistory([payout("new", 50, "PAID", "2026-10-02"), payout("unpaid", 100, "DRAFT"), payout("old", 25)]);
  assert.equal(rows[0].runningPaidTotal, 75); assert.equal(rows[1].runningPaidTotal, null); assert.equal(rows[2].runningPaidTotal, 25);
  assert.equal(rows[0].paymentReference, "ref-new");
});
test("legacy payments use commission owed only if amount sent is missing", () => {
  const row = buildAffiliatePayoutHistory([{ ...payout("legacy", 20), paymentAmount: null }])[0];
  assert.equal(row.runningPaidTotal, 20);
});
test("all history contributes to totals beyond fifty monthly records", () => {
  const rows = buildAffiliatePayoutHistory(Array.from({ length: 60 }, (_, i) => payout(String(i).padStart(2, "0"), 0.1)));
  assert.equal(rows.at(-1)?.runningPaidTotal, 6); assert.equal(rows.length, 60);
});
test("saving payout email updates only the authenticated user's account", async () => {
  const calls: unknown[] = [];
  const client = { affiliateAccount: { updateMany: async (args: unknown) => { calls.push(args); return { count: 1 }; } } } as unknown as Pick<PrismaClient, "affiliateAccount">;
  const saved = await saveAffiliatePayoutEmail(client, "user-a", { payoutEmail: "  preferred@example.com " });
  assert.equal(saved, "preferred@example.com");
  assert.deepEqual(calls, [{ where: { userId: "user-a" }, data: { payoutEmail: "preferred@example.com" } }]);
});
test("invalid email and injected account IDs fail before any write", async () => {
  let writes = 0;
  const client = { affiliateAccount: { updateMany: async () => { writes++; return { count: 1 }; } } } as unknown as Pick<PrismaClient, "affiliateAccount">;
  await assert.rejects(saveAffiliatePayoutEmail(client, "user-a", { payoutEmail: "invalid" }));
  await assert.rejects(saveAffiliatePayoutEmail(client, "user-a", { payoutEmail: "valid@example.com", userId: "user-b" }));
  assert.equal(writes, 0);
});
test("a missing affiliate profile does not report a successful email save", async () => {
  const client = { affiliateAccount: { updateMany: async () => ({ count: 0 }) } } as unknown as Pick<PrismaClient, "affiliateAccount">;
  await assert.rejects(saveAffiliatePayoutEmail(client, "unknown", { payoutEmail: "valid@example.com" }), /not found/);
});

test("affiliate dashboard displays complete outstanding amount, actual lifetime payments, and payout email setup", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
  const { AffiliateDashboard } = await import("../src/components/affiliates/affiliate-dashboard");
  const data: import("../src/lib/affiliate-types").AffiliateDashboardData = {
    account: { id: "test", code: "TESTCODE", commissionRate: 10, status: "ACTIVE", totalClicks: 0, totalOrders: 0, totalEarnings: 110, pendingEarnings: 30, paidEarnings: 80, payoutEmail: null, missedMinimumMonths: 0, frozenAt: null },
    currentMonth: { qualifyingSales: 0, commissionRate: 10, minimumMet: false, amountToMinimum: 300, nextTierThreshold: 1500, nextTierRate: 20, amountToNextTier: 1500 },
    conversionRate: 0, commissionByStatus: { PENDING: 10, APPROVED: 5, LOCKED: 15, PAID: 100 },
    clicks: [], attributions: [], commissions: [], payouts: buildAffiliatePayoutHistory([payout("done", 80)]), clickChart: [], commissionChart: [],
  };
  const router = { refresh: () => {} } as import("next/dist/shared/lib/app-router-context.shared-runtime").AppRouterInstance;
  const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router }, createElement(AffiliateDashboard, { data })));
  assert.match(html, /Outstanding commission<\/p><p[^>]*>\$30\.00/);
  assert.match(html, /Total paid to you — all time<\/p><p[^>]*>\$80\.00/);
  assert.match(html, /Awaiting monthly payout<\/p><p[^>]*>\$15\.00/);
  assert.match(html, /Not set/); assert.match(html, /Save payout email/);
  assert.match(html, /type="email"/); assert.match(html, /Running paid total/);
});
