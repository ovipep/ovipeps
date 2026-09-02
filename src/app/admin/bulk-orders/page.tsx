import { BulkOrderRequestManager } from "@/components/admin/bulk-order-request-manager";
import { ensureBulkOrderSchema, parseBulkOrderItems } from "@/lib/bulk-orders";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminBulkOrdersPage() {
  await ensureBulkOrderSchema();
  const requests = await db.bulkOrderRequest.findMany({ orderBy: { createdAt: "desc" } });
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Bulk Order Requests</h1><p className="mt-1 text-sm text-muted-foreground">Review requests, email quotes, record payment, and complete shipment. Payment Received changes a request to blue Pending Shipment; Shipped changes it to red Complete.</p></div>
    <BulkOrderRequestManager initialRequests={requests.map((entry) => ({
      id: entry.id, firstName: entry.firstName, lastName: entry.lastName, email: entry.email,
      items: parseBulkOrderItems(entry.items), additionalContext: entry.additionalContext,
      status: entry.status, adminDecision: entry.adminDecision, discountedPricing: entry.discountedPricing,
      eta: entry.eta, paymentConfirmed: entry.paymentConfirmed,
      customerDecisionSentAt: entry.customerDecisionSentAt?.toISOString() ?? null,
      quoteExpiresAt: entry.quoteExpiresAt?.toISOString() ?? null,
      purchaseOrderNumber: entry.purchaseOrderNumber,
      purchaseIntentAt: entry.purchaseIntentAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString(),
    }))} />
  </div>;
}
