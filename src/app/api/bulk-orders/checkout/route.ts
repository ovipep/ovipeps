import { z } from "zod";
import { auth } from "@/lib/auth";
import { bulkAddressSchema } from "@/lib/bulk-checkout-schema";
import {
  completeBulkCheckout,
  sendRecordedBulkConfirmation,
  BulkCheckoutError,
} from "@/lib/bulk-checkout";
import { sendInventoryAlertsForVariants } from "@/lib/inventory";
const checkoutSchema = z.object({
  token: z.string().length(64),
  version: z.string().regex(/^[a-f0-9]{32}$/),
  address: bulkAddressSchema,
  termsAccepted: z.literal(true),
});
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email)
    return Response.json(
      { error: "Sign in to confirm your shipping address" },
      { status: 401 },
    );
  const input = checkoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!input.success)
    return Response.json(
      {
        error: "Check your shipping address and accept the research-use terms.",
      },
      { status: 400 },
    );
  try {
    const { order } = await completeBulkCheckout(
      input.data.token,
      { id: session.user.id, email: session.user.email },
      input.data.address,
      input.data.version,
    );
    let emailWarning = false;
    try {
      await sendRecordedBulkConfirmation(input.data.token);
    } catch {
      emailWarning = true;
    }
    try {
      await sendInventoryAlertsForVariants(order.items.map((i) => i.variantId));
    } catch {
      console.error("Bulk order inventory alert needs retry");
    }
    return Response.json({ orderNumber: order.orderNumber, emailWarning });
  } catch (error) {
    console.error(
      "Bulk checkout failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      {
        error:
          error instanceof BulkCheckoutError
            ? error.message
            : "Unable to record your bulk order. Please contact OVIpeps before paying.",
      },
      { status: error instanceof BulkCheckoutError ? error.status : 503 },
    );
  }
}
