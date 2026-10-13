import assert from "node:assert/strict";
import { test } from "node:test";
import { orderIncludesPeptides, reconstituteVideoSection, RECONSTITUTE_VIDEO_URL } from "../src/lib/order-email-video";

for (const category of ["RESEARCH_PEPTIDE", "BUNDLE"]) test(`video is included for ${category} orders`, () => {
  assert.equal(orderIncludesPeptides([{ category }]), true);
});
test("mixed peptide and supply orders include the video once", () => {
  assert.equal(orderIncludesPeptides([{ category: "SUPPLY" }, { category: "RESEARCH_PEPTIDE" }, { category: "RESEARCH_PEPTIDE" }]), true);
  const section = reconstituteVideoSection();
  assert.equal(section.html.split(RECONSTITUTE_VIDEO_URL).length - 1, 1);
});
test("supply-only orders do not include peptide video", () => {
  assert.equal(orderIncludesPeptides([{ category: "SUPPLY" }, { category: "SUPPLY" }]), false);
  assert.equal(orderIncludesPeptides([]), false);
});
test("video is watchable through HTML button and plain-text email link", () => {
  const section = reconstituteVideoSection();
  assert.match(section.html, /Watch Reconstitute video/);
  assert.ok(section.html.includes(`href="${RECONSTITUTE_VIDEO_URL}"`));
  assert.ok(section.text.includes(RECONSTITUTE_VIDEO_URL));
  assert.match(section.html, /Reconstitute video/);
});

test("stored custom confirmations retain their content and still include the video in both email formats", async () => {
  const globals = globalThis as unknown as { prisma?: unknown };
  const prior = globals.prisma;
  globals.prisma = { siteSetting: { findMany: async () => [{ key: "email_template_order_confirmation_body", value: "Custom confirmation for {{orderNumber}}" }] } };
  try {
    const { buildEmailTemplate } = await import("../src/lib/emails");
    const email = await buildEmailTemplate("order_confirmation", { orderNumber: "OVI-TEST" }, { includeReconstituteVideo: true });
    assert.match(email.text, /Custom confirmation for OVI-TEST/);
    assert.ok(email.html.includes(RECONSTITUTE_VIDEO_URL));
    assert.ok(email.text.includes(RECONSTITUTE_VIDEO_URL));
    const supplies = await buildEmailTemplate("order_confirmation", { orderNumber: "OVI-SUPPLIES" });
    assert.equal(supplies.html.includes(RECONSTITUTE_VIDEO_URL), false);
    const password = await buildEmailTemplate("password_reset", {}, { includeReconstituteVideo: true });
    assert.equal(password.html.includes(RECONSTITUTE_VIDEO_URL), false);
  } finally { globals.prisma = prior; }
});

test("accepted bulk peptide purchases include the video without changing payment instructions", async () => {
  const { buildBulkPurchaseInstructionsEmail } = await import("../src/lib/emails");
  const input = { firstName: "Test", purchaseOrderNumber: "PO-TEST", discountedPricing: "$200 CAD", eta: "October", eTransferEmail: "ovipeps@gmail.com", eTransferInstructions: "Existing instructions", quoteExpiresAt: new Date("2026-10-20T12:00:00Z") };
  const email = buildBulkPurchaseInstructionsEmail({ ...input, includeReconstituteVideo: true });
  assert.ok(email.text.includes(RECONSTITUTE_VIDEO_URL)); assert.ok(email.html.includes(RECONSTITUTE_VIDEO_URL));
  assert.match(email.text, /Existing instructions/); assert.match(email.text, /PO-TEST/);
  const supplies = buildBulkPurchaseInstructionsEmail(input);
  assert.equal(supplies.text.includes(RECONSTITUTE_VIDEO_URL), false);
});
