import {
  reconcileAllAffiliateMinimums,
  reconcilePaidAffiliateCommissions,
} from "@/lib/affiliate";
import { sendEmail } from "@/lib/emails";
import { reconcileInventoryAlerts } from "@/lib/inventory";
import { expireUnpaidOrders } from "@/lib/orders";
import { retryPendingRestockDeliveries } from "@/lib/restock-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ownerEmail = "ovipeps@gmail.com";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkedAt = new Date();

  try {
    const expiredOrders = await expireUnpaidOrders();
    const affiliateCommissions = await reconcilePaidAffiliateCommissions();
    await reconcileAllAffiliateMinimums();
    const restockDeliveries = await retryPendingRestockDeliveries();
    const inventoryVariants = await reconcileInventoryAlerts();

    if (affiliateCommissions.failures.length) {
      throw new Error(
        `Affiliate commission repair failed for: ${affiliateCommissions.failures
          .map((failure) => failure.orderNumber)
          .join(", ")}`
      );
    }

    console.info("Automation reconciliation completed", {
      checkedAt: checkedAt.toISOString(),
      expiredOrders,
      affiliateCommissions,
      restockDeliveries,
      inventoryVariants,
    });

    return Response.json({
      ok: true,
      checkedAt: checkedAt.toISOString(),
      expiredOrders,
      affiliateCommissions,
      restockDeliveries,
      inventoryVariants,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown automation reconciliation failure";
    console.error("Automation reconciliation failed", error);

    const date = checkedAt.toISOString().slice(0, 10);
    const alert = await sendEmail(
      ownerEmail,
      {
        subject: "Action required: OVIpeps automation check failed",
        text: `The scheduled OVIpeps automation check failed at ${checkedAt.toISOString()}.\n\n${message}\n\nPlease open the Back Office and review orders, affiliates, inventory, and restock notifications.`,
        html: `<h1>OVIpeps automation check failed</h1><p>The scheduled automation check failed at <strong>${checkedAt.toISOString()}</strong>.</p><p>${message}</p><p>Please open the Back Office and review orders, affiliates, inventory, and restock notifications.</p>`,
      },
      { idempotencyKey: `automation-reconciliation-failure-${date}` }
    );

    return Response.json(
      {
        ok: false,
        checkedAt: checkedAt.toISOString(),
        error: message,
        alertSent: alert.success,
      },
      { status: 503 }
    );
  }
}
