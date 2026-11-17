import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/orders";
import type { CreateOrderInput } from "@/lib/orders";
import { createOrderAccessToken } from "@/lib/order-access";
import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const addressSchema = z.object({
  firstName: text(80),
  lastName: text(80),
  address1: text(160),
  address2: z.string().trim().max(160).optional(),
  city: text(100),
  province: text(80),
  postalCode: z.string().trim().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/),
  country: z.literal("CA"),
  phone: z.string().trim().max(40).optional(),
});
const orderSchema = z.object({
  deliveryMethod: z.enum(["SHIPPING", "PICKUP"]).default("SHIPPING"),
  shippingAddress: z.object({
    firstName: text(80), lastName: text(80), address1: z.string().trim().max(160).optional(),
    address2: z.string().trim().max(160).optional(), city: z.string().trim().max(100).optional(),
    province: z.string().trim().max(80).optional(), postalCode: z.string().trim().max(20).optional(),
    country: z.literal("CA"), phone: z.string().trim().max(40).optional(),
  }),
  billingAddress: addressSchema,
  items: z.array(z.object({
    productId: text(128), variantId: text(128), sku: z.string().trim().max(100).optional(),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(50),
  discountCode: z.string().trim().max(100).nullable().optional(),
  affiliateCode: z.string().trim().max(100).nullable().optional(),
  referralCode: z.string().trim().max(100).nullable().optional(),
  termsAccepted: z.boolean().optional(),
  researchUseAccepted: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.deliveryMethod === "PICKUP") return;
  for (const field of ["address1", "city", "province", "postalCode"] as const) {
    if (!value.shippingAddress[field]) ctx.addIssue({ code: "custom", path: ["shippingAddress", field], message: field + " is required for shipping" });
  }
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Sign in or create an account before placing an order." }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Your account could not be found. Please sign in again." }, { status: 401 });
    }

    const parsed = orderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "One or more order or billing details are invalid" }, { status: 400 });
    }
    const body = parsed.data;

    if (!body.termsAccepted && !body.researchUseAccepted) {
      return NextResponse.json(
        { error: "Please agree to the Terms, Privacy Policy, and Disclaimer to continue" },
        { status: 400 }
      );
    }

    const order = await createOrder({
      ...body,
      email: user.email,
      userId: user.id,
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
      "Sign in or create an account before placing an order.",
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
