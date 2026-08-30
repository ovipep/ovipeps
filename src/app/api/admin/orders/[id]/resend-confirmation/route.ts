import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { resendOrderConfirmation } from "@/lib/orders";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await resendOrderConfirmation(id);
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ORDER_CONFIRMATION_RESENT",
        entity: "Order",
        entityId: id,
        details: JSON.stringify(result),
      },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resend confirmation";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
