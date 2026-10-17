import { BulkOrderRequestManager } from "@/components/admin/bulk-order-request-manager";
import { ensureBulkOrderSchema, parseBulkOrderItems } from "@/lib/bulk-orders";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminBulkOrdersPage() {
  await ensureBulkOrderSchema();
  const requests = await db.bulkOrderRequest.findMany({ orderBy: { createdAt: "desc" } });
  const orders = await db.order.findMany({where:{id:{in:requests.flatMap(r=>r.orderId?[r.orderId]:[])}},select:{id:true,orderNumber:true,status:true}});
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Bulk Order Requests</h1><p className="mt-1 text-sm text-muted-foreground">Review inquiries and customer replies, prepare itemized recaps, and approve customer emails. After the customer confirms shipping, the linked shop order manages payment, inventory, and shipment.</p></div>
    <BulkOrderRequestManager initialRequests={requests.map((entry) => ({
      id: entry.id, firstName: entry.firstName, lastName: entry.lastName, email: entry.email,
      items: parseBulkOrderItems(entry.items), additionalContext: entry.additionalContext, customerReply: entry.customerReply, orderId: entry.orderId, orderNumber: orders.find(o=>o.id===entry.orderId)?.orderNumber ?? null,
      status: (()=>{const status=orders.find(o=>o.id===entry.orderId)?.status; return status === "COMPLETED" || status === "SHIPPED" ? "COMPLETE" : status === "PAYMENT_RECEIVED" || status === "PROCESSING" ? "PENDING_SHIPMENT" : status === "CANCELLED" ? "CANCELLED" : entry.status;})(), adminDecision: entry.adminDecision, discountedPricing: entry.discountedPricing,
      eta: entry.eta, paymentConfirmed: entry.paymentConfirmed,
      customerDecisionSentAt: entry.customerDecisionSentAt?.toISOString() ?? null,
      quoteExpiresAt: entry.quoteExpiresAt?.toISOString() ?? null,
      purchaseOrderNumber: entry.purchaseOrderNumber,
      purchaseIntentAt: entry.purchaseIntentAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString(),
    }))} />
  </div>;
}
