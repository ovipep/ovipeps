"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GeneratePayoutForm() {
  const router = useRouter();
  const previousMonth = new Date();
  previousMonth.setDate(1);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const [year, setYear] = useState(previousMonth.getFullYear().toString());
  const [month, setMonth] = useState((previousMonth.getMonth() + 1).toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/affiliates/payouts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year), month: Number(month) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate payout");
      setSuccess(`Payout generated for ${month}/${year}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-3">
      <Input
        label="Year"
        type="number"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        className="w-24"
      />
      <Input
        label="Month"
        type="number"
        min={1}
        max={12}
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="w-24"
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Generating…" : "Generate Report"}
      </Button>
      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
    </form>
  );
}

export function MarkPayoutPaidButton({ payoutItemId, amount }: { payoutItemId: string; amount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"E_TRANSFER" | "CRYPTO">("E_TRANSFER");
  const paymentAmount = amount.toFixed(2);
  const [paidBy, setPaidBy] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleMarkPaid() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/affiliates/payouts/${payoutItemId}/mark-paid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod,
            paymentAmount: Number(paymentAmount),
            paidBy,
            paidAt,
            paymentReference: paymentReference || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to mark as paid");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (saved) return <p role="status" className="text-sm text-success">Paid — payment recorded.</p>;

  return (
    <div className="min-w-[260px] space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-sm font-semibold">Mark Paid</p>
      <p className="text-sm text-muted-foreground">Record a payment you have already sent. Clears this month’s amount owed and adds it to payout history and the Business Ledger.</p>
      <label className="block text-xs font-medium">Method
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "E_TRANSFER" | "CRYPTO")} className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
          <option value="E_TRANSFER">e-Transfer</option>
          <option value="CRYPTO">Crypto</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Amount paid (CAD)" type="number" value={paymentAmount} readOnly />
        <Input label="Date paid" type="date" max={new Date().toISOString().slice(0, 10)} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
      </div>
      <Input label="Sent by (employee)" placeholder="Employee name" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} />
      <Input label="Reference / transaction ID" placeholder="Optional" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
      <Button size="sm" onClick={handleMarkPaid} disabled={loading || paidBy.trim().length < 2 || !paidAt || Number(paymentAmount) <= 0}>
        {loading ? "Saving…" : "Paid"}
      </Button>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
