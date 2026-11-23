import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShipOrderButton({
  orderId,
  initialTrackingNumber = "",
  canShip = true,
  manualFulfillment = false,
}: {
  orderId: string;
  initialTrackingNumber?: string;
  canShip?: boolean;
  manualFulfillment?: boolean;
}) {
  // Native submission works before hydration and reloads persisted server data.
  return (
    <form action={`/api/admin/orders/${orderId}/mark-shipped`} method="post" className="max-w-md space-y-3">
      <Input
        label="Tracking Number (optional)"
        name="trackingNumber"
        defaultValue={initialTrackingNumber}
        maxLength={100}
        placeholder="Enter tracking number, if applicable"
        autoComplete="off"
      />
      {manualFulfillment && canShip && (
        <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
          <input
            type="checkbox"
            name="allowBackordered"
            value="true"
            required
            className="mt-1 size-4 accent-primary"
          />
          <span>
            I manually fulfilled and shipped all items in this order. Recording this shipment will not change inventory.
          </span>
        </label>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="action" value="save-tracking" variant="outline">Save Tracking</Button>
        {canShip && <Button type="submit" name="action" value="ship">Shipped</Button>}
      </div>
    </form>
  );
}
