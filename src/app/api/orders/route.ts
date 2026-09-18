import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import type { CreateOrderInput } from "@/lib/orders";
import { createOrderAccessToken } from "@/lib/order-access";
import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const orderSchema = z.object({
  email: z.string().trim().email().max(254),
  shippingAddress: z.object({
    firstName: text(80), lastName: text(80), address1: text(160),
    address2: z.string().trim().max(160).optional(), city: text(100),
    province: text(80), postalCode: text(20), country: text(80),
    phone: z.string().trim().max(40).optional(),
  }),
  items: z.array(z.object({
    productId: text(128), variantId: text(128), sku: z.string().trim().max(100).optional(),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(50),
  discountCode: z.string().trim().max(100).nullable().optional(),
  affiliateCode: z.string().trim().max(100).nullable().optional(),
  referralCode: z.string().trim().max(100).nullable().optional(),
  termsAccepted: z.boolean().optional(),
  researchUseAccepted: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = orderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "One or more order details are invalid" }, { status: 400 });
    }
    const body = parsed.data;
    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session?.user?.id ?? null;
    } catch (error) {
      // Account lookup is optional for guest checkout. A missing or temporary
      // auth configuration must not prevent a customer from placing an order.
      console.error("Optional checkout session lookup failed", error);
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
    } as CreateOrderInput);

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
