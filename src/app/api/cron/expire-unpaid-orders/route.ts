import { expireUnpaidOrders } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cancelledCount = await expireUnpaidOrders();

  return Response.json({ ok: true, cancelledCount });
}
