import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { completeShipment } from "@/lib/order-shipping";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const order = await completeShipment(id);
    return NextResponse.json({ id: order.id, orderNumber: order.orderNumber, status: order.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark order as shipped";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
