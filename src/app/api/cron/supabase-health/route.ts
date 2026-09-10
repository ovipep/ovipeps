import { db } from "@/lib/db";
import { sendEmail } from "@/lib/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ownerEmail = process.env.SUPABASE_HEALTH_ALERT_EMAIL ?? "ovipeps@gmail.com";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkedAt = new Date();

  try {
    // Use separate, read-only requests so Supabase sees consistent daily database
    // activity and we validate the tables the storefront depends on.
    const [connection, products, orders] = await Promise.all([
      db.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`,
      db.product.count(),
      db.order.count(),
    ]);

    return Response.json({
      ok: connection[0]?.ok === 1,
      checkedAt: checkedAt.toISOString(),
      products,
      orders,
    });
  } catch (error) {
    console.error("Supabase health check failed", error);

    const date = checkedAt.toISOString().slice(0, 10);
    const alert = await sendEmail(
      ownerEmail,
      {
        subject: "Action required: OVIpeps database health check failed",
        text: `The scheduled OVIpeps database health check failed at ${checkedAt.toISOString()}.\n\nPlease check the Supabase project and Vercel deployment settings. Technical details are available in the Vercel function logs.`,
        html: `<h1>OVIpeps database health check failed</h1><p>The scheduled database check failed at <strong>${checkedAt.toISOString()}</strong>.</p><p>Please check the Supabase project and Vercel deployment settings. Technical details are available in the Vercel function logs.</p>`,
      },
      { idempotencyKey: `supabase-health-failure-${date}` }
    );

    return Response.json(
      { ok: false, checkedAt: checkedAt.toISOString(), alertSent: alert.success },
      { status: 503 }
    );
  }
}
