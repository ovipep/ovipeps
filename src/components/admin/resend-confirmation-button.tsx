"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResendConfirmationButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!window.confirm("Resend this order confirmation to the customer now?")) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/orders/${orderId}/resend-confirmation`,
        { method: "POST" }
      );
      const data = (await response.json()) as {
        error?: string;
        attachmentCount?: number;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to resend confirmation");
      }
      setMessage(
        data.attachmentCount
          ? "Confirmation sent with the Retatrutide guide attached."
          : "Confirmation sent."
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to resend confirmation"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleResend} disabled={loading} variant="outline">
        {loading ? "Sending…" : "Resend confirmation email"}
      </Button>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
