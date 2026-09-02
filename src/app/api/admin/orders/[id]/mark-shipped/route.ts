import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { completeShipment } from "@/lib/order-shipping";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const trackingNumber =
      typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";

    if (trackingNumber.length > 100) {
      return NextResponse.json(
        { error: "Tracking number must be 100 characters or fewer" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const order = await completeShipment(id, trackingNumber || undefined);

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark order as shipped";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
