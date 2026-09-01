"use client";

import { useState } from "react";
import { CheckCircle2, ShoppingCart, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BulkOrderResponseActions({ token, initialAction }: { token: string; initialAction?: string }) {
  const [selectedAction, setSelectedAction] = useState<"purchase" | "opt-out" | null>(initialAction === "purchase" || initialAction === "opt-out" ? initialAction : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState<{ status: string; purchaseOrderNumber?: string; emailWarning?: boolean } | null>(null);

  async function confirm() {
    if (!selectedAction) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/bulk-orders/respond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: selectedAction }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to record your decision.");
      setComplete(result);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "Unable to record your decision.");
    } finally { setBusy(false); }
  }

  if (complete) return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
    <h2 className="mt-3 text-xl font-semibold text-navy-deep">{complete.status === "OPTED_OUT" ? "Your opt-out has been recorded" : "Purchase decision received"}</h2>
    {complete.purchaseOrderNumber && <><p className="mt-2 text-sm text-muted-foreground">Your e-transfer instructions have been emailed to you.</p><p className="mt-3 font-bold text-navy-deep">Purchase order: {complete.purchaseOrderNumber}</p></>}
    {complete.emailWarning && <p className="mt-3 text-sm text-amber-700">Your decision was recorded, but an email delivery issue occurred. Please contact ovipeps@gmail.com.</p>}
  </div>;

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => setSelectedAction("purchase")} className={`rounded-2xl border-2 p-5 text-left transition ${selectedAction === "purchase" ? "border-emerald-500 bg-emerald-50" : "border-sky/20 hover:border-sky/40"}`}><ShoppingCart className="h-6 w-6 text-emerald-600" /><p className="mt-3 font-semibold text-navy-deep">Purchase Now</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Receive your purchase order number and e-transfer instructions.</p></button>
      <button type="button" onClick={() => setSelectedAction("opt-out")} className={`rounded-2xl border-2 p-5 text-left transition ${selectedAction === "opt-out" ? "border-slate-500 bg-slate-50" : "border-sky/20 hover:border-sky/40"}`}><XCircle className="h-6 w-6 text-slate-500" /><p className="mt-3 font-semibold text-navy-deep">Opt Out</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Decline this quote and close the request.</p></button>
    </div>
    {selectedAction && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Please confirm: {selectedAction === "purchase" ? "I want to proceed with this bulk purchase and receive e-transfer instructions." : "I want to opt out of this bulk order quote."}</div>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <Button size="lg" className="w-full" disabled={!selectedAction || busy} onClick={confirm}>{busy ? "Recording…" : selectedAction === "purchase" ? "Confirm Purchase Now" : selectedAction === "opt-out" ? "Confirm Opt Out" : "Select a decision"}</Button>
  </div>;
}
