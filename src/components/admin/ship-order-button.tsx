"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ShipOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleShipped() {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/mark-shipped`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to mark order as shipped");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }
  return <div className="space-y-2"><Button onClick={handleShipped} disabled={loading} variant="primary">{loading ? "Updating…" : "Shipped"}</Button>{error && <p className="text-sm text-error">{error}</p>}</div>;
}
