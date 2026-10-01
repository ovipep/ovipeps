import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { completeShipment, saveOrderTracking, OrderShippingError } from "@/lib/order-shipping";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const isForm = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ?? false;
  function reply(body: Record<string, unknown>, status: number) {
    if (!isForm) return NextResponse.json(body, { status });
    const url = new URL(`/admin/orders/${encodeURIComponent(id)}`, request.url);
    if (status >= 400) url.searchParams.set("shipmentError", String(body.error));
    else url.searchParams.set("shipmentSaved", String(body.action));
    return NextResponse.redirect(url, 303);
  }

  try {
    // Native forms need an explicit same-origin check as well as admin auth.
    const origin = request.headers.get("origin");
    if ((isForm && !origin) || (origin && new URL(origin).host !== new URL(request.url).host)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
    const session = await requireAdmin();
    if (!session) {
      return reply({ error: "Your session has expired. Sign in again to save this order." }, 401);
    }
    let body: Record<string, unknown>;
    try {
      body = isForm
        ? Object.fromEntries(await request.formData())
        : await request.json();
    } catch {
      return reply({ error: "Invalid request. Reload the order and try again." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply({ error: "Invalid request." }, 400);
    }
    const action = body.action ?? "ship";
    if (action !== "ship" && action !== "save-tracking") {
      return reply({ error: "Invalid order action." }, 400);
    }
    if (body.trackingNumber !== undefined && body.trackingNumber !== null && typeof body.trackingNumber !== "string") {
      return reply({ error: "Tracking number must be text." }, 400);
    }
    const trackingNumber = typeof body.trackingNumber === "string"
      ? body.trackingNumber.trim()
      : body.trackingNumber === null ? "" : undefined;
    if (action === "save-tracking" && trackingNumber === undefined) {
      return reply({ error: "Tracking number is missing." }, 400);
    }
    const order = action === "save-tracking"
      ? await saveOrderTracking(id, trackingNumber!)
      : await completeShipment(id, trackingNumber);

    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/orders");
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${order.orderNumber}`);
    return reply({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
      action,
    }, 200);
  } catch (error) {
    if (error instanceof OrderShippingError) {
      return reply({ error: error.message }, error.status);
    }
    console.error("Admin order shipping update failed", { orderId: id, error });
    return reply({ error: "The order could not be saved. Reload the order to check its current status, then retry." }, 500);
  }
}
