import type { Prisma } from '@/generated/prisma/client';
import type { BulkPlan } from '@/lib/bulk-checkout-schema';

/** A specifically authorized correction. Caller supplies the enclosing transaction. */
export async function correctBulkStockAllocation(tx: Prisma.TransactionClient, requestId: string, orderNumber: string, adminId: string) {
  if (!(await tx.user.findFirst({where:{id:adminId,role:'ADMIN'},select:{id:true}}))) throw new Error('Administrator required');
  await tx.$queryRaw`SELECT id FROM "BulkOrderRequest" WHERE id=${requestId} FOR UPDATE`;
  const request=await tx.bulkOrderRequest.findUniqueOrThrow({where:{id:requestId}});
  const plan=request.checkoutPlan as unknown as BulkPlan;
  if (!request.orderId || plan?.existingOrderNumber!==orderNumber || !request.recapApprovedAt || !request.recapSentAt) throw new Error('Approved linked order required');
  const before=await tx.order.findUniqueOrThrow({where:{id:request.orderId},include:{items:true}});
  const tb=before.items.find(i=>i.sku==='TB500-10MG');
  const cjc=before.items.find(i=>i.sku==='CJCIPA-10MG');
  if(before.orderNumber!==orderNumber || before.total!==1488.5 || !tb || tb.quantity!==10 || !cjc || cjc.quantity!==13) throw new Error('Order differs from approved correction');
  const action='BULK_TB_STOCK_RETURN_20261017';
  if(await tx.auditLog.findFirst({where:{entity:'Order',entityId:before.id,action}})) return {released:0,alreadyApplied:true};
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${tb.productId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${before.id} FOR UPDATE`;
  const order=await tx.order.findUniqueOrThrow({where:{id:before.id},include:{items:true}});
  const line=order.items.find(i=>i.id===tb.id);
  const cjcLine=order.items.find(i=>i.id===cjc.id);
  if(!['AWAITING_PAYMENT','PAYMENT_RECEIVED','PROCESSING'].includes(order.status) || order.shippedAt || line?.quantity!==10 || line.reservedQuantity!==1 || cjcLine?.reservedQuantity!==3) throw new Error('Reservation or fulfillment changed; review before releasing stock');
  const variant=await tx.productVariant.findUniqueOrThrow({where:{id:line.variantId}});
  await tx.orderItem.update({where:{id:line.id},data:{reservedQuantity:0}});
  await tx.productVariant.update({where:{id:variant.id},data:{stockQuantity:{increment:1},inStock:true}});
  const note='10 TB-500 and 10 CJC/Ipamorelin vials pending shipping upon restock. The 3 additional CJC/Ipamorelin vials remain reserved. Existing TB-500 shelf stock is not allocated to this bulk order.';
  await tx.order.update({where:{id:order.id},data:{notes:`${order.notes ?? ''}\n${note}`}});
  await tx.bulkOrderRequest.update({where:{id:request.id},data:{checkoutPlan:{...plan,items:plan.items.map(i=>({...i,useExistingInventory:i.sku==='BPC157-10MG'})),fulfillmentNote:`${plan.fulfillmentNote}\n${note}`} as unknown as Prisma.InputJsonValue}});
  await tx.auditLog.create({data:{userId:adminId,action,entity:'Order',entityId:order.id,details:JSON.stringify({requestId,sku:line.sku,released:1,stockBefore:variant.stockQuantity,stockAfter:variant.stockQuantity+1,quantity:10,pendingRestock:10,cjcReserved:3,cjcPendingRestock:10})}});
  return {released:1,alreadyApplied:false};
}
