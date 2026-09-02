"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RestockManager({ token, products, allInventory }: { token: string; products: Array<{ id: string; name: string }>; allInventory: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function unsubscribe(productId?: string) {
    const key = productId ?? "all";
    setBusy(key);
    setMessage("");
    const response = await fetch("/api/restock-subscriptions/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, productId }),
    });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return setMessage(result.error || "We could not update your notifications");
    setMessage(productId ? "That product has been removed from your notifications." : "You have been unsubscribed from all restock notifications.");
    window.setTimeout(() => window.location.reload(), 700);
  }

  return <div className="space-y-5">
    {message && <p role="status" className="rounded-xl bg-sky/10 px-4 py-3 text-sm text-navy-deep">{message}</p>}
    {allInventory && <p className="rounded-xl border border-sky/20 bg-sky/5 px-4 py-3 text-sm">You are currently subscribed to all inventory.</p>}
    {products.length > 0 && <div className="divide-y divide-border rounded-xl border border-border bg-white">
      {products.map((product) => <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="font-medium">{product.name}</span>
        <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void unsubscribe(product.id)}>Remove product</Button>
      </div>)}
    </div>}
    <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void unsubscribe()}>{busy === "all" ? "Unsubscribing..." : "Unsubscribe from all restock notifications"}</Button>
  </div>;
}
