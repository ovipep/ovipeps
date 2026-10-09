"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PayoutEmailForm({ payoutEmail }: { payoutEmail: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState(payoutEmail ?? "");
  const [savedEmail, setSavedEmail] = useState(payoutEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/affiliates/payout-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutEmail: email }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save payout email.");
      setEmail(body.payoutEmail); setSavedEmail(body.payoutEmail);
      setMessage("Your payout email has been saved."); router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save payout email.");
    } finally { setLoading(false); }
  }

  return <Card>
    <CardHeader><CardTitle>Your payout email</CardTitle><CardDescription>Enter the email address where you want to receive affiliate e-Transfers. It can be different from your login email.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm"><strong>Saved payout email:</strong> {savedEmail ?? "Not set — please save your preferred email below."}</p>
      <form onSubmit={save} className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
        <Input label="Preferred payout email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setMessage(null); setError(null); }} placeholder="you@example.com" disabled={loading} />
        <Button type="submit" disabled={loading || !email.trim()}>{loading ? "Saving…" : "Save payout email"}</Button>
      </form>
      {message && <p role="status" className="text-sm text-success">{message}</p>}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </CardContent>
  </Card>;
}
