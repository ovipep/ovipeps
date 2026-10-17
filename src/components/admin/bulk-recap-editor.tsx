"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BulkPlanInput, BulkPlan } from "@/lib/bulk-checkout-schema";
interface Variant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  stockQuantity: number;
  price: number;
  isDefault: boolean;
  product: { name: string; slug: string };
}
interface RecapRequest {
  id: string;
  items: { productId: string; units: number }[];
  checkoutPlan: BulkPlan | null;
  recapDraft: { subject: string; text: string; html: string } | null;
  recapVersion: string | null;
  recapApprovedAt: string | null;
  recapSentAt: string | null;
  recapError: string | null;
  orderId: string | null;
  email: string;
  customerReply: string | null;
}
interface Detail {
  request: RecapRequest;
  variants: Variant[];
  orders: {
    orderNumber: string;
    total: number;
    items: { productName: string; quantity: number }[];
  }[];
}
export function BulkRecapEditor({ requestId }: { requestId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null),
    [input, setInput] = useState<BulkPlanInput | null>(null);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [approved, setApproved] = useState(false);
  async function load() {
    if (detail) {
      setOpen(!open);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/bulk-orders/${requestId}/recap`,
        { cache: "no-store" },
      );
      const d = await response.json();
      if (!response.ok) throw new Error(d.error);
      setDetail(d);
      setOpen(true);
      const plan = d.request.checkoutPlan as BulkPlan | null;
      setInput(
        plan
          ? {
              items: plan.items.map((i) => ({
                variantId: i.variantId,
                quantity: i.quantity,
                additionalQuantity: i.additionalQuantity,
                lineTotal: i.totalPrice,
              })),
              supplementalDocumentKeys: plan.supplementalDocumentKeys ?? [],
              shippingAmount: plan.shippingAmount,
              taxAmount: plan.taxAmount,
              fulfillmentNote: plan.fulfillmentNote,
              allowBackorder: plan.allowBackorder,
              existingOrderNumber: plan.existingOrderNumber ?? "",
            }
          : {
              items: d.request.items.map(
                (i: { productId: string; units: number }) => {
                  const v =
                    d.variants.find(
                      (v: Variant) =>
                        v.productId === i.productId && v.isDefault,
                    ) ??
                    d.variants.find(
                      (v: Variant) => v.productId === i.productId,
                    );
                  return {
                    variantId: v?.id ?? "",
                    quantity: i.units,
                    lineTotal: 0,
                  };
                },
              ),
              shippingAmount: 0,
              taxAmount: 0,
              fulfillmentNote: "",
              allowBackorder: false,
              existingOrderNumber: "",
            },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load draft");
    } finally {
      setBusy(false);
    }
  }
  function edit(next: BulkPlanInput) {
    setInput(next);
    setDirty(true);
    setApproved(false);
    setMessage("");
  }
  async function submit(action: "prepare" | "approve_send") {
    if (!detail || !input) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/bulk-orders/${requestId}/recap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "prepare"
              ? { action, ...input }
              : { action, version: detail.request.recapVersion },
          ),
        },
      );
      const d = await response.json();
      if (!response.ok) throw new Error(d.error);
      setDetail({ ...detail, request: { ...detail.request, ...d.request } });
      setDirty(false);
      setApproved(false);
      setMessage(
        action === "prepare"
          ? "Draft saved. No email was sent and no stock was deducted."
          : "Approved recap sent. The customer can now sign in and confirm shipping.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save draft");
    } finally {
      setBusy(false);
    }
  }
  const locked = Boolean(
    detail?.request.recapApprovedAt || detail?.request.orderId,
  );
  return (
    <section className="mt-5 border-t pt-5">
      <Button type="button" variant="outline" onClick={load} disabled={busy}>
        {busy
          ? "Loading…"
          : open
            ? "Hide order recap"
            : "Prepare / Review order recap"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {open && detail && input && (
        <div className="mt-5 space-y-5">
          <p className="rounded-xl bg-amber-50 p-4 text-sm">
            Drafts are held for approval. Saving a draft sends nothing. Customer
            comments must be reflected in the exact vial sizes, quantities, and
            prices below.
          </p>
          {detail.request.customerReply && (
            <p className="whitespace-pre-wrap rounded-xl bg-sky/5 p-4 text-sm">
              <strong>Customer reply:</strong> {detail.request.customerReply}
            </p>
          )}
          <fieldset disabled={busy || locked} className="space-y-4">
            <legend className="mb-3 font-bold">Itemized order</legend>
            {input.items.map((line, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl border p-4 sm:grid-cols-4"
              >
                <label className="text-xs font-bold sm:col-span-2">
                  Product / vial size
                  <select
                    value={line.variantId}
                    onChange={(e) =>
                      edit({
                        ...input,
                        items: input.items.map((i, n) =>
                          n === index ? { ...i, variantId: e.target.value } : i,
                        ),
                      })
                    }
                    className="mt-2 w-full rounded border p-2 text-sm"
                  >
                    <option value="">Select vial size</option>
                    {detail.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.product.name} — {v.name} ({v.stockQuantity}{" "}
                        available)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold">
                  Vials / units
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={line.quantity}
                    onChange={(e) =>
                      edit({
                        ...input,
                        items: input.items.map((i, n) =>
                          n === index
                            ? { ...i, quantity: Number(e.target.value) }
                            : i,
                        ),
                      })
                    }
                    className="mt-2 w-full rounded border p-2 text-sm"
                  />
                </label>
                <label className="text-xs font-bold">
                  Line total (CAD)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.lineTotal}
                    onChange={(e) =>
                      edit({
                        ...input,
                        items: input.items.map((i, n) =>
                          n === index
                            ? { ...i, lineTotal: Number(e.target.value) }
                            : i,
                        ),
                      })
                    }
                    className="mt-2 w-full rounded border p-2 text-sm"
                  />
                </label>
                <label className="text-xs font-bold">Of the total, additional vials (optional)<input type="number" min="0" max={Math.max(0,line.quantity-1)} value={line.additionalQuantity ?? 0} onChange={e=>edit({...input,items:input.items.map((i,n)=>n===index?{...i,additionalQuantity:Number(e.target.value)}:i)})} className="mt-2 w-full rounded border p-2 text-sm" /></label>
                <button
                  type="button"
                  onClick={() =>
                    edit({
                      ...input,
                      items: input.items.filter((_, n) => n !== index),
                    })
                  }
                  className="text-left text-xs text-red-700 underline"
                >
                  Remove line
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-sky underline"
              onClick={() =>
                edit({
                  ...input,
                  items: [
                    ...input.items,
                    { variantId: "", quantity: 1, lineTotal: 0 },
                  ],
                })
              }
            >
              Add product / vial size
            </button>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Shipping (CAD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={input.shippingAmount}
                  onChange={(e) =>
                    edit({ ...input, shippingAmount: Number(e.target.value) })
                  }
                  className="mt-2 w-full rounded border p-2"
                />
              </label>
              <label className="text-sm font-semibold">
                Tax (CAD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={input.taxAmount}
                  onChange={(e) =>
                    edit({ ...input, taxAmount: Number(e.target.value) })
                  }
                  className="mt-2 w-full rounded border p-2"
                />
              </label>
            </div>
            <label className="block text-sm font-semibold">
              Shipping schedule / pending items
              <textarea
                rows={4}
                value={input.fulfillmentNote}
                onChange={(e) =>
                  edit({ ...input, fulfillmentNote: e.target.value })
                }
                className="mt-2 w-full rounded border p-2"
                placeholder="Describe what ships now and what will ship after restocking."
              />
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.allowBackorder}
                onChange={(e) =>
                  edit({ ...input, allowBackorder: e.target.checked })
                }
              />
              Record unavailable units as backordered and reserve them as stock
              arrives.
            </label>
            <label className="block text-sm font-semibold">
              Reconcile an existing unpaid order (prevents duplicate stock
              deductions)
              <select
                value={input.existingOrderNumber ?? ""}
                onChange={(e) =>
                  edit({ ...input, existingOrderNumber: e.target.value })
                }
                className="mt-2 w-full rounded border p-2"
              >
                <option value="">
                  Create a new order after customer confirms shipping
                </option>
                {detail.orders.map((o) => (
                  <option key={o.orderNumber} value={o.orderNumber}>
                    {o.orderNumber} — ${o.total.toFixed(2)} —{" "}
                    {o.items
                      .map((i) => `${i.productName} × ${i.quantity}`)
                      .join(", ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={input.supplementalDocumentKeys?.includes("peptide_reference") ?? false} onChange={e=>edit({...input,supplementalDocumentKeys:e.target.checked?["peptide_reference"]:[]})} />Attach peptide_reference.pdf to this recap and its order confirmation.</label>
            <Button type="button" onClick={() => submit("prepare")}>
              Save draft — do not send
            </Button>
          </fieldset>
          {detail.request.recapDraft && (
            <div className="space-y-4 rounded-xl border p-4">
              <p className="text-sm">
                <strong>To:</strong> {detail.request.email}
                <br />
                <strong>CC:</strong> ovipeps@gmail.com
                <br />
                <strong>Subject:</strong> {detail.request.recapDraft.subject}
              </p>
              <iframe
                title="Saved customer email preview"
                sandbox=""
                srcDoc={detail.request.recapDraft.html}
                className="h-[640px] w-full rounded border bg-white"
              />
              <details>
                <summary className="cursor-pointer text-sm font-semibold">
                  Plain text email and PDF attachment list
                </summary>
                <pre className="mt-3 whitespace-pre-wrap break-words text-sm">
                  {detail.request.recapDraft.text}
                </pre>
              </details>
              {detail.request.recapSentAt ? (
                <p className="text-sm font-bold text-emerald-800">
                  Recap sent{" "}
                  {new Date(detail.request.recapSentAt).toLocaleString()}. The
                  customer must sign in and confirm shipping before the order is
                  recorded.
                </p>
              ) : (
                <>
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={approved}
                      disabled={dirty || busy}
                      onChange={(e) => setApproved(e.target.checked)}
                    />
                    I approve this saved email, exact quantities, prices,
                    payment details, and listed PDF attachments.
                  </label>
                  <Button
                    disabled={!approved || dirty || busy}
                    onClick={() => submit("approve_send")}
                  >
                    {busy ? "Sending…" : "Approve & send this recap"}
                  </Button>
                  {dirty && (
                    <p className="text-sm text-amber-800">
                      Save and review the updated draft before approving.
                    </p>
                  )}
                </>
              )}
              {detail.request.recapError && (
                <p role="alert" className="text-sm text-red-700">
                  {detail.request.recapError}
                </p>
              )}
            </div>
          )}
          {message && (
            <p role="status" className="text-sm font-semibold text-emerald-800">
              {message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
