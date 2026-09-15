import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteOrder } from "@/lib/orders";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteOrder(id, { deletedBy: session.user.id });
    return NextResponse.json(deleted);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete order";
    return NextResponse.json(
      { error: message },
      { status: message === "Order not found" ? 404 : 400 }
    );
  }
}
