import { createHmac, timingSafeEqual } from "node:crypto";

function getSigningSecret() {
  const secret =
    process.env.ORDER_ACCESS_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Order access signing secret is not configured");
  }
  return secret;
}

export function createOrderAccessToken(orderNumber: string, email: string) {
  return createHmac("sha256", getSigningSecret())
    .update(`${orderNumber}|${email.trim().toLowerCase()}`)
    .digest("base64url");
}

export function verifyOrderAccessToken(
  token: string | null | undefined,
  orderNumber: string,
  email: string
) {
  if (!token) return false;

  const expected = createOrderAccessToken(orderNumber, email);
  const providedBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
