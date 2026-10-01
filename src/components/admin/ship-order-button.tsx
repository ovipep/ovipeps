import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShipOrderButton({
  orderId,
  initialTrackingNumber = "",
  canShip = true,
}: {
  orderId: string;
  initialTrackingNumber?: string;
  canShip?: boolean;
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
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="action" value="save-tracking" variant="outline">Save Tracking</Button>
        {canShip && <Button type="submit" name="action" value="ship">Shipped</Button>}
      </div>
    </form>
  );
}
