import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import type { CreateOrderInput } from "@/lib/orders";
import { createOrderAccessToken } from "@/lib/order-access";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderInput & {
      termsAccepted?: boolean;
      /** @deprecated Prefer termsAccepted */
      researchUseAccepted?: boolean;
    };
    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session?.user?.id ?? null;
    } catch (error) {
      // Account lookup is optional for guest checkout. A missing or temporary
      // auth configuration must not prevent a customer from placing an order.
      console.error("Optional checkout session lookup failed", error);
    }

    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!body.shippingAddress) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    if (!body.items?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (
      body.items.some(
        (item) =>
          !item.productId ||
          !item.variantId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 100
      )
    ) {
      return NextResponse.json(
        { error: "One or more cart items are invalid" },
        { status: 400 }
      );
    }

    if (!body.termsAccepted && !body.researchUseAccepted) {
      return NextResponse.json(
        { error: "Please agree to the Terms, Privacy Policy, and Disclaimer to continue" },
        { status: 400 }
      );
    }

    const order = await createOrder({
      ...body,
      userId,
    });

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      accessToken: createOrderAccessToken(order.orderNumber, order.email),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safeMessages = [
      "Cart is empty",
      "Invalid discount code",
      "Discount code is not yet active",
      "Discount code has expired",
      "Discount code has reached its usage limit",
      "Affiliate code not found or inactive",
      "Product and variant mismatch",
      "One or more cart items are no longer available",
    ];
    const isSafe =
      safeMessages.some((safeMessage) => message.startsWith(safeMessage)) ||
      message.endsWith(" is restocking") ||
      message.startsWith("Minimum order amount");

    return NextResponse.json(
      {
        error: isSafe
          ? message
          : "We could not place the order right now. Please try again or contact support.",
      },
      { status: isSafe ? 400 : 503 }
    );
  }
}
