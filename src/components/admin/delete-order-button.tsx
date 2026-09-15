"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface DeleteOrderButtonProps {
  orderId: string;
  orderNumber: string;
  redirectAfterDelete?: boolean;
}

export function DeleteOrderButton({
  orderId,
  orderNumber,
  redirectAfterDelete = false,
}: DeleteOrderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete order ${orderNumber}? This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete order");
      }

      if (redirectAfterDelete) {
        router.push("/admin/orders");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        onClick={handleDelete}
        disabled={loading}
        variant="danger"
        size="sm"
      >
        {loading ? "Deleting…" : "Delete"}
      </Button>
      {error && <p className="max-w-48 text-xs text-error">{error}</p>}
    </div>
  );
}
