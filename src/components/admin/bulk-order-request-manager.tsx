"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, CreditCard, Mail, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Item { productName: string; kits: number; units: number }
interface RequestRecord {
  id: string; firstName: string; lastName: string; email: string; items: Item[];
  additionalContext: string | null; status: string; adminDecision: string | null;
  discountedPricing: string | null; eta: string | null; paymentConfirmed: boolean;
  customerDecisionSentAt: string | null; createdAt: string;
}

function label(status: string) {
  if (status === "PURCHASED") return "Purchased";
  if (status === "OPTED_OUT") return "Opted Out";
  return "Pending Decision";
}

export function BulkOrderRequestManager({ initialRequests }: { initialRequests: RequestRecord[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});

  async function update(id: string, payload: Record<string, unknown>) {
    setBusy(id); setMessage((current) => ({ ...current, [id]: "" }));
    try {
      const response = await fetch(`/api/admin/bulk-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save changes.");
      setRequests((current) => current.map((entry) => entry.id === id ? { ...entry, ...result.request, createdAt: new Date(result.request.createdAt).toISOString(), customerDecisionSentAt: result.request.customerDecisionSentAt ? new Date(result.request.customerDecisionSentAt).toISOString() : null } : entry));
      setMessage((current) => ({ ...current, [id]: payload.sendCustomerUpdate ? "Saved and emailed to the customer." : "Changes saved." }));
      setConfirming(null);
    } catch (error) {
      setMessage((current) => ({ ...current, [id]: error instanceof Error ? error.message : "Unable to save changes." }));
    } finally { setBusy(null); }
  }

  function field(id: string, key: "adminDecision" | "discountedPricing" | "eta", value: string) {
    setRequests((current) => current.map((entry) => entry.id === id ? { ...entry, [key]: value } : entry));
  }

  if (!requests.length) return <div className="rounded-2xl border border-dashed border-sky/20 p-12 text-center text-sm text-muted-foreground">No bulk order requests have been submitted yet.</div>;

  return <div className="space-y-6">{requests.map((entry) => <article key={entry.id} className="rounded-2xl border border-sky/15 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-lg font-semibold text-navy-deep">{entry.firstName} {entry.lastName}</h2><a href={`mailto:${entry.email}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-sky hover:underline"><Mail className="h-3.5 w-3.5" />{entry.email}</a><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(entry.createdAt).toLocaleString()} · {entry.id}</p></div>
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${entry.status === "PURCHASED" ? "bg-emerald-100 text-emerald-800" : entry.status === "OPTED_OUT" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}><Clock3 className="h-3.5 w-3.5" />{label(entry.status)}</span>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{entry.items.map((item, index) => <div key={`${item.productName}-${index}`} className="rounded-xl border border-sky/10 bg-sky/5 p-3"><p className="text-sm font-semibold text-navy-deep">{item.productName}</p><p className="mt-1 text-xs text-muted-foreground">{item.kits} kit{item.kits === 1 ? "" : "s"} · {item.units} units</p></div>)}</div>
    {entry.additionalContext && <div className="mt-4 rounded-xl bg-muted/60 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Context/Information</p><p className="mt-2 whitespace-pre-wrap text-sm">{entry.additionalContext}</p></div>}
    <div className="mt-6 grid gap-4">
      <label className="text-sm font-semibold text-navy-deep">Discounted pricing<textarea value={entry.discountedPricing ?? ""} onChange={(event) => field(entry.id, "discountedPricing", event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-sky/20 px-3 py-2 font-normal" placeholder="Enter the discounted price breakdown for the request." /></label>
      <label className="text-sm font-semibold text-navy-deep">ETA<input value={entry.eta ?? ""} onChange={(event) => field(entry.id, "eta", event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-sky/20 px-3 font-normal" placeholder="Example: 7–10 business days" /></label>
      <label className="text-sm font-semibold text-navy-deep">Final purchase decision / admin notes<textarea value={entry.adminDecision ?? ""} onChange={(event) => field(entry.id, "adminDecision", event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-sky/20 px-3 py-2 font-normal" /></label>
    </div>
    <div className="mt-5 flex flex-wrap gap-2">
      <Button variant="secondary" disabled={busy === entry.id} onClick={() => update(entry.id, { adminDecision: entry.adminDecision ?? "", discountedPricing: entry.discountedPricing ?? "", eta: entry.eta ?? "" })}><Save className="h-4 w-4" /> Save</Button>
      <Button disabled={busy === entry.id || !entry.discountedPricing?.trim() || !entry.eta?.trim()} onClick={() => update(entry.id, { adminDecision: entry.adminDecision ?? "", discountedPricing: entry.discountedPricing ?? "", eta: entry.eta ?? "", sendCustomerUpdate: true })}><Mail className="h-4 w-4" /> Save & Email Quote</Button>
      <Button variant="outline" disabled={busy === entry.id} onClick={() => update(entry.id, { status: "OPTED_OUT" })}><XCircle className="h-4 w-4" /> Opted Out</Button>
      {confirming === entry.id ? <Button disabled={busy === entry.id} onClick={() => update(entry.id, { status: "PURCHASED", confirmPaymentReceived: true })}><CheckCircle2 className="h-4 w-4" /> Confirm Payment Received</Button> : <Button variant="outline" disabled={busy === entry.id || entry.status === "PURCHASED"} onClick={() => setConfirming(entry.id)}><CreditCard className="h-4 w-4" /> Purchased</Button>}
    </div>
    {confirming === entry.id && <p className="mt-3 text-sm font-medium text-amber-700">Purchased will only be recorded after you select Confirm Payment Received.</p>}
    {message[entry.id] && <p className="mt-3 text-sm text-muted-foreground">{message[entry.id]}</p>}
  </article>)}</div>;
}
