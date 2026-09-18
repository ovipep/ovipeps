import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyOrderAccessToken } from "@/lib/order-access";
import { getOrderByNumber, updatePaymentReference } from "@/lib/orders";

interface RouteContext {
  params: Promise<{ orderNumber: string }>;
}

async function canAccessOrder(
  request: Request,
  order: NonNullable<Awaited<ReturnType<typeof getOrderByNumber>>>
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isOwner = Boolean(session?.user?.id && session.user.id === order.userId);
  const isAdmin = role === "ADMIN";
  const token = new URL(request.url).searchParams.get("token");

  return (
    isOwner ||
    isAdmin ||
    verifyOrderAccessToken(token, order.orderNumber, order.email)
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { orderNumber } = await context.params;
  const order = await getOrderByNumber(orderNumber);

  if (!order || !(await canAccessOrder(request, order))) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orderNumber } = await context.params;

  try {
    const existingOrder = await getOrderByNumber(orderNumber);
    if (!existingOrder || !(await canAccessOrder(request, existingOrder))) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = (await request.json()) as { paymentReference?: string };

    if (!body.paymentReference?.trim() || body.paymentReference.trim().length > 200) {
      return NextResponse.json(
        { error: "Payment reference is required" },
        { status: 400 }
      );
    }

    const order = await updatePaymentReference(
      orderNumber,
      body.paymentReference
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch {
    return NextResponse.json(
      { error: "Failed to update payment reference" },
      { status: 400 }
    );
  }
}
