import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  AWAITING_PAYMENT: {
    label: "Submitted — Awaiting External Payment",
    className: "border-warning/30 bg-warning/15 text-warning",
  },
  PAYMENT_RECEIVED: {
    label: "Pending Shipping",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  PROCESSING: {
    label: "Pending Shipping",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  SHIPPED: {
    label: "Shipped",
    className: "border-teal/30 bg-teal/10 text-teal",
  },
  COMPLETED: {
    label: "Complete",
    className: "border-success/30 bg-success/10 text-success",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "border-border bg-muted text-muted-foreground",
  },
  REFUNDED: {
    label: "Refunded",
    className: "border-burgundy/30 bg-burgundy/10 text-burgundy",
  },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "",
  };

  return (
    <Badge className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
