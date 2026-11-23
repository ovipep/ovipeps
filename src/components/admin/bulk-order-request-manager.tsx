"use client";

import Link from "next/link";
import { BulkRecapEditor } from "@/components/admin/bulk-recap-editor";
import { useState } from "react";
import { BadgeCheck, Clock3, Mail, PackageCheck, RefreshCw, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Item { productName: string; kits: number; units: number }
interface RequestRecord {
  id: string; firstName: string; lastName: string; email: string; items: Item[];
  orderId: string | null; orderNumber: string | null;
  customerReply: string | null;
  additionalContext: string | null; status: string; adminDecision: string | null;
  discountedPricing: string | null; eta: string | null; paymentConfirmed: boolean;
  customerDecisionSentAt: string | null; recapSentAt: string | null; createdAt: string; quoteExpiresAt: string | null;
  purchaseOrderNumber: string | null; purchaseIntentAt: string | null;
  shipmentTrackingNumber: string | null; shipmentCarrier: string | null;
}

function label(status: string) {
  if (status === "PENDING_REVIEW") return "Reply Received - Review Required";
  if (status === "AWAITING_PAYMENT") return "Awaiting E-Transfer";
  if (status === "PENDING_SHIPMENT") return "Pending Shipment";
  if (status === "COMPLETE") return "Complete";
  if (status === "PURCHASED") return "Customer Approved — Awaiting Payment";
  if (status === "OPTED_OUT") return "Opted Out";
  return "Pending Decision";
}

function isAwaitingMailingConfirmation(entry: Pick<RequestRecord, "purchaseIntentAt" | "orderId" | "status">) {
  return Boolean(entry.purchaseIntentAt) &&
    !entry.orderId &&
    !["OPTED_OUT", "AWAITING_PAYMENT", "PENDING_SHIPMENT", "COMPLETE", "CANCELLED", "PURCHASED"].includes(entry.status);
}

function requestLabel(entry: RequestRecord) {
  return isAwaitingMailingConfirmation(entry)
    ? "Purchase Selected — Awaiting Mailing Confirmation"
    : label(entry.status);
}

function formatEasternDate(value: string) {
  return new Date(value).toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BulkOrderRequestManager({ initialRequests }: { initialRequests: RequestRecord[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>(() => Object.fromEntries(initialRequests.map((entry) => [entry.id, entry.shipmentTrackingNumber ?? ""])));
  const [trackingCarriers, setTrackingCarriers] = useState<Record<string, string>>(() => Object.fromEntries(initialRequests.map((entry) => [entry.id, entry.shipmentCarrier ?? ""])));

  async function update(id: string, payload: Record<string, unknown>) {
    setBusy(id); setMessage((current) => ({ ...current, [id]: "" }));
    try {
      const response = await fetch(`/api/admin/bulk-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save changes.");
      setRequests((current) => current.map((entry) => entry.id === id ? { ...entry, ...result.request, orderNumber: result.orderNumber ?? entry.orderNumber, createdAt: new Date(result.request.createdAt).toISOString(), customerDecisionSentAt: result.request.customerDecisionSentAt ? new Date(result.request.customerDecisionSentAt).toISOString() : null } : entry));
      const manualAction = payload.manualAction;
      const successMessage = manualAction === "customer_approved"
        ? "Customer approval recorded. No email was sent and inventory was not changed."
        : manualAction === "paid"
          ? "Marked paid and created a linked shop order. No email was sent and inventory was not changed."
          : manualAction === "shipped"
            ? "Marked shipped. No email was sent and inventory was not changed."
            : payload.sendCustomerUpdate
              ? "Saved and emailed to the customer."
              : "Changes saved.";
      setMessage((current) => ({ ...current, [id]: successMessage }));
    } catch (error) {
      setMessage((current) => ({ ...current, [id]: error instanceof Error ? error.message : "Unable to save changes." }));
    } finally { setBusy(null); }
  }

  async function orderAction(entry: RequestRecord, action: "paid" | "shipped" | "resend") {
    if (!entry.orderId) return;
    setBusy(entry.id);
    setMessage((current) => ({ ...current, [entry.id]: "" }));
    const endpoint = action === "paid"
      ? `/api/admin/orders/${entry.orderId}/confirm-payment`
      : action === "shipped"
        ? `/api/admin/orders/${entry.orderId}/mark-shipped`
        : `/api/admin/orders/${entry.orderId}/resend-confirmation`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(action === "shipped" ? { body: JSON.stringify({ action: "ship", ...(trackingNumbers[entry.id]?.trim() ? { trackingNumber: trackingNumbers[entry.id].trim() } : {}), allowBackordered: true }) } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update the linked order.");
      if (action === "paid") {
        setRequests((current) => current.map((item) => item.id === entry.id ? { ...item, status: "PENDING_SHIPMENT", paymentConfirmed: true } : item));
      } else if (action === "shipped") {
        setRequests((current) => current.map((item) => item.id === entry.id ? { ...item, status: "COMPLETE" } : item));
      }
      setMessage((current) => ({ ...current, [entry.id]: action === "paid" ? "Payment marked received." : action === "shipped" ? "Order marked shipped." : "Order confirmation resent." }));
    } catch (error) {
      setMessage((current) => ({ ...current, [entry.id]: error instanceof Error ? error.message : "Unable to update the linked order." }));
    } finally {
      setBusy(null);
    }
  }

  function field(id: string, key: "adminDecision" | "discountedPricing" | "eta", value: string) {
    setRequests((current) => current.map((entry) => entry.id === id ? { ...entry, [key]: value } : entry));
  }

  if (!requests.length) return <div className="rounded-2xl border border-dashed border-sky/20 p-12 text-center text-sm text-muted-foreground">No bulk order requests have been submitted yet.</div>;

  return <div className="space-y-6">{requests.map((entry) => <article key={entry.id} className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${isAwaitingMailingConfirmation(entry) ? "border-indigo-500 ring-2 ring-indigo-200" : entry.status === "AWAITING_PAYMENT" ? "border-emerald-500 ring-2 ring-emerald-200" : entry.status === "PENDING_SHIPMENT" ? "border-blue-500 ring-2 ring-blue-200" : entry.status === "COMPLETE" ? "border-red-500 ring-2 ring-red-200" : "border-sky/15"}`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-lg font-semibold text-navy-deep">{entry.firstName} {entry.lastName}</h2><a href={`mailto:${entry.email}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-sky hover:underline"><Mail className="h-3.5 w-3.5" />{entry.email}</a><p className="mt-1 text-xs text-muted-foreground">Submitted {formatEasternDate(entry.createdAt)} ET · {entry.id}</p></div>
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isAwaitingMailingConfirmation(entry) ? "bg-indigo-100 text-indigo-800" : entry.status === "AWAITING_PAYMENT" ? "bg-emerald-100 text-emerald-800" : entry.status === "PENDING_SHIPMENT" || entry.status === "PURCHASED" ? "bg-blue-100 text-blue-800" : entry.status === "COMPLETE" ? "bg-red-100 text-red-800" : entry.status === "OPTED_OUT" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}><Clock3 className="h-3.5 w-3.5" />{requestLabel(entry)}</span>
    </div>
    {entry.purchaseOrderNumber && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Purchase order number</p><p className="mt-1 text-lg font-bold text-emerald-950">{entry.purchaseOrderNumber}</p><p className="mt-1 text-xs text-emerald-800">Customer selected Purchase Now{entry.purchaseIntentAt ? ` on ${formatEasternDate(entry.purchaseIntentAt)} ET` : ""}.{isAwaitingMailingConfirmation(entry) ? " Waiting for mailing confirmation; no shop order or payment request has been created yet." : " Watch for the matching e-transfer."}</p></div>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{entry.items.map((item, index) => <div key={`${item.productName}-${index}`} className="rounded-xl border border-sky/10 bg-sky/5 p-3"><p className="text-sm font-semibold text-navy-deep">{item.productName}</p><p className="mt-1 text-xs text-muted-foreground">{item.kits} kit{item.kits === 1 ? "" : "s"} · {item.units} units</p></div>)}</div>
    {entry.additionalContext && <div className="mt-4 rounded-xl bg-muted/60 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Context/Information</p><p className="mt-2 whitespace-pre-wrap text-sm">{entry.additionalContext}</p></div>}
    {entry.customerReply && <div className="mt-4 rounded-xl border border-sky/20 bg-sky/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-navy-deep">Customer reply with decision</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.customerReply}</p></div>}
    {entry.orderId && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold">Linked shop order: <Link href={`/admin/orders/${entry.orderId}`} className="underline">{entry.orderNumber ?? entry.orderId}</Link></p>}
    {!entry.orderId && <BulkRecapEditor requestId={entry.id} hasSentRecap={Boolean(entry.recapSentAt)} />}
    <div className="mt-6 grid gap-4">
      <label className="text-sm font-semibold text-navy-deep">Discounted pricing<textarea value={entry.discountedPricing ?? ""} onChange={(event) => field(entry.id, "discountedPricing", event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-sky/20 px-3 py-2 font-normal" placeholder="Enter the discounted price breakdown for the request." /></label>
      <label className="text-sm font-semibold text-navy-deep">ETA<input value={entry.eta ?? ""} onChange={(event) => field(entry.id, "eta", event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-sky/20 px-3 font-normal" placeholder="Example: 7–10 business days" /></label>
      <label className="text-sm font-semibold text-navy-deep">Final purchase decision / admin notes<textarea value={entry.adminDecision ?? ""} onChange={(event) => field(entry.id, "adminDecision", event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-sky/20 px-3 py-2 font-normal" /></label>
    </div>
    <div className="mt-5 flex flex-wrap gap-2">
      <Button disabled={busy === entry.id || Boolean(entry.orderId)} onClick={() => update(entry.id, { adminDecision: entry.adminDecision ?? "", discountedPricing: entry.discountedPricing ?? "", eta: entry.eta ?? "" })}><Save className="h-4 w-4" /> Save Draft</Button>
      <Button variant="outline" disabled={busy === entry.id || Boolean(entry.orderId) || Boolean(entry.purchaseIntentAt) || !entry.discountedPricing?.trim() || !entry.eta?.trim()} onClick={() => update(entry.id, { adminDecision: entry.adminDecision ?? "", discountedPricing: entry.discountedPricing ?? "", eta: entry.eta ?? "", sendCustomerUpdate: true })}><Mail className="h-4 w-4" /> {entry.customerDecisionSentAt ? "Send Updated Quote" : "Send Quote"}</Button>
      <Button variant="outline" disabled={busy === entry.id || Boolean(entry.orderId) || ["PENDING_SHIPMENT", "COMPLETE", "PURCHASED"].includes(entry.status)} onClick={() => update(entry.id, { status: "OPTED_OUT" })}><XCircle className="h-4 w-4" /> Opted Out</Button>
    </div>
    {!entry.orderId && <div className="mt-5 rounded-xl border border-sky/15 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-navy-deep">Manual order status</p>
      <p className="mt-1 text-xs text-muted-foreground">Record approval or payment confirmed outside the website. Marking paid creates a linked sales order for the ledger; no email is sent and inventory is not changed.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy === entry.id || ["PURCHASED", "AWAITING_PAYMENT", "PENDING_SHIPMENT", "COMPLETE"].includes(entry.status)} onClick={() => update(entry.id, { manualAction: "customer_approved" })}><BadgeCheck className="h-4 w-4" /> Customer Approved</Button>
        <Button variant="outline" disabled={busy === entry.id || (!["PURCHASED", "AWAITING_PAYMENT"].includes(entry.status) && !(entry.status === "COMPLETE" && entry.paymentConfirmed))} onClick={() => update(entry.id, { manualAction: "paid" })}><BadgeCheck className="h-4 w-4" /> {entry.status === "COMPLETE" && entry.paymentConfirmed ? "Create Missing Sales Order" : "Mark Paid"}</Button>
        <Button variant="outline" disabled={busy === entry.id || entry.status !== "PENDING_SHIPMENT"} onClick={() => update(entry.id, { manualAction: "shipped" })}><PackageCheck className="h-4 w-4" /> Mark Shipped</Button>
      </div>
    </div>}
    {entry.orderId && <div className="mt-5 rounded-xl border border-sky/15 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-navy-deep">Linked order actions</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy === entry.id || entry.status !== "AWAITING_PAYMENT"} onClick={() => orderAction(entry, "paid")}><BadgeCheck className="h-4 w-4" /> Mark Paid</Button>
        <Button variant="outline" disabled={busy === entry.id || entry.status !== "PENDING_SHIPMENT"} onClick={() => orderAction(entry, "shipped")}><PackageCheck className="h-4 w-4" /> Mark Shipped</Button>
        <Button variant="outline" disabled={busy === entry.id} onClick={() => orderAction(entry, "resend")}><RefreshCw className="h-4 w-4" /> Resend Order</Button>
      </div>

    </div>}
    {["PENDING_SHIPMENT", "COMPLETE"].includes(entry.status) && <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-navy-deep">Shipment details</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">Tracking number<input value={trackingNumbers[entry.id] ?? ""} onChange={(event) => setTrackingNumbers((current) => ({ ...current, [entry.id]: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-sky/20 bg-white px-3 text-sm font-normal text-foreground" placeholder="Enter tracking number" /></label>
        <label className="text-xs font-semibold text-muted-foreground">Shipping carrier (optional)<input value={trackingCarriers[entry.id] ?? ""} onChange={(event) => setTrackingCarriers((current) => ({ ...current, [entry.id]: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-sky/20 bg-white px-3 text-sm font-normal text-foreground" placeholder="Canada Post, UPS, etc." /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={busy === entry.id} onClick={() => update(entry.id, { shipmentTrackingNumber: trackingNumbers[entry.id] ?? "", shipmentCarrier: trackingCarriers[entry.id] ?? "" })}><Save className="h-4 w-4" /> Save Shipment Details</Button><span className="text-xs text-muted-foreground">Saving tracking does not send email or change inventory.</span></div>
    </div>}
    {message[entry.id] && <p className="mt-3 text-sm text-muted-foreground">{message[entry.id]}</p>}
  </article>)}</div>;
}
