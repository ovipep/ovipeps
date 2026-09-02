"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShipOrderButton({
  orderId,
  initialTrackingNumber = "",
}: {
  orderId: string;
  initialTrackingNumber?: string;
}) {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShipped() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/mark-shipped`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: trackingNumber.trim() || null }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to mark order as shipped");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md space-y-3">
      <Input
        label="Tracking Number (optional)"
        value={trackingNumber}
        onChange={(event) => setTrackingNumber(event.target.value)}
        maxLength={100}
        placeholder="Enter tracking number, if applicable"
        autoComplete="off"
        disabled={loading}
      />
      <Button onClick={handleShipped} disabled={loading} variant="primary">
        {loading ? "Updating…" : "Shipped"}
      </Button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
