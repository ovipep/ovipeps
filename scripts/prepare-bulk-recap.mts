/** Optional one-time production recap task. Sending requires an explicit approve_send command. */
import { z } from 'zod';
import { db } from '../src/lib/db';
import { prepareBulkRecap, approveAndSendBulkRecap, reconcileApprovedExistingBulkOrder } from '../src/lib/bulk-checkout';

async function main() {
  const raw=process.env.BULK_RECAP_PREPARE_REQUEST;
  if(!raw || process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'production') return;
  const command=z.object({action:z.enum(["prepare","approve_send","inspect_order","reconcile_order"]).default("prepare"),replaceHeldDraft:z.boolean().optional(),supplementalDocumentKeys:z.array(z.enum(["peptide_reference"])).optional(),requestId:z.string().min(1),existingOrderNumber:z.string().min(1),items:z.array(z.object({slug:z.string(),size:z.string(),quantity:z.number().int().positive(),additionalQuantity:z.number().int().nonnegative().optional(),lineTotal:z.number().positive()})).min(1),shippingAmount:z.number().nonnegative(),taxAmount:z.number().nonnegative(),fulfillmentNote:z.string().min(1),allowBackorder:z.boolean()}).parse(JSON.parse(raw));
  const request=await db.bulkOrderRequest.findUniqueOrThrow({where:{id:command.requestId}});
  const owner=await db.user.findFirst({where:{email:{equals:'ovipeps@gmail.com',mode:'insensitive'},role:'ADMIN'},select:{id:true}});
  if(!owner) throw new Error('Owner administrator is required for this recap task');
  if (command.action === 'inspect_order' || command.action === 'reconcile_order') {
    const plan=request.checkoutPlan as unknown as import('../src/lib/bulk-checkout-schema').BulkPlan | null;
    if (!plan || !request.recapVersion || plan.existingOrderNumber !== command.existingOrderNumber || plan.items.length !== command.items.length) throw new Error('Saved recap does not match this order');
    const total=Math.round((command.items.reduce((n,i)=>n+i.lineTotal,0)+command.shippingAmount+command.taxAmount)*100)/100;
    if(plan.total !== total) throw new Error('Approved total mismatch');
    for (const item of command.items) {
      const line=plan.items.find(i=>i.productSlug===item.slug);
      if (!line || line.quantity!==item.quantity || line.totalPrice!==item.lineTotal) throw new Error('Approved item mismatch');
    }
    const before=await db.order.findUniqueOrThrow({where:{orderNumber:command.existingOrderNumber},include:{items:true,payments:true}});
    const {bulkAddressSchema}=await import('../src/lib/bulk-checkout-schema');
    const describe=(order:typeof before)=>({orderNumber:order.orderNumber,status:order.status,total:order.total,hasAccount:!!order.userId,validStoredAddress:bulkAddressSchema.safeParse(order.shippingAddress).success,items:order.items.map(i=>({sku:i.sku,quantity:i.quantity,reserved:i.reservedQuantity??i.quantity})),payments:order.payments.map(p=>({status:p.status,amount:p.amount}))});
    console.log('BULK_ORDER_BEFORE '+JSON.stringify({...describe(before),linked:request.orderId===before.id,approved:!!request.recapApprovedAt,sent:!!request.recapSentAt}));
    if (command.action==='inspect_order') return;
    const result=await reconcileApprovedExistingBulkOrder(request.id,request.recapVersion,owner.id);
    const after=await db.order.findUniqueOrThrow({where:{id:result.order.id},include:{items:true,payments:true}});
    const linked=await db.bulkOrderRequest.findUniqueOrThrow({where:{id:request.id}});
    if(after.id!==before.id || after.total!==total || linked.orderId!==after.id) throw new Error('Order reconciliation verification failed');
    console.log('BULK_ORDER_VERIFIED '+JSON.stringify({...describe(after),linked:true,changed:result.created,emailSent:false}));
    return;
  }
  if(command.action === 'approve_send') {
    if(request.recapSentAt) {console.log('Approved bulk recap already sent; duplicate send skipped.'); return;}
    const plan=request.checkoutPlan as unknown as import('../src/lib/bulk-checkout-schema').BulkPlan | null;
    if(!plan || !request.recapVersion || plan.existingOrderNumber !== command.existingOrderNumber || plan.items.length !== command.items.length) throw new Error('Saved recap does not match the approved order');
    const total=Math.round((command.items.reduce((n,i)=>n+i.lineTotal,0)+command.shippingAmount+command.taxAmount)*100)/100;
    if(plan.total !== total || plan.shippingAmount !== command.shippingAmount || plan.taxAmount !== command.taxAmount) throw new Error('Saved recap prices differ from the approved prices');
    for(const item of command.items) {
      const line=plan.items.find(i=>i.productSlug===item.slug);
      if(!line || line.quantity !== item.quantity || line.totalPrice !== item.lineTotal || (line.additionalQuantity??0)!==(item.additionalQuantity??0)) throw new Error('Saved recap quantities differ from the approved quantities');
    }
    for(const key of command.supplementalDocumentKeys ?? []) if(!plan.supplementalDocumentKeys?.includes(key)) throw new Error('Approved PDF attachment is missing');
    const sent=await approveAndSendBulkRecap(request.id,request.recapVersion,owner.id);
    if(!sent.recapSentAt || !sent.recapEmailId) throw new Error('Email acceptance could not be verified');
    console.log('Approved bulk recap sent successfully; email ID: '+sent.recapEmailId);
    return;
  }
  if(request.recapApprovedAt || request.recapSentAt || request.orderId) throw new Error("Cannot revise an approved, sent, or recorded purchase");
  if(request.checkoutPlan && !command.replaceHeldDraft) {
    console.log('Bulk recap setup skipped: draft or order already exists.');return;
  }
  const variants=await db.productVariant.findMany({where:{product:{slug:{in:command.items.map(i=>i.slug)}}},include:{product:{select:{slug:true}}}});
  const normalize=(value:string|null)=>value?.toLowerCase().replace(/[^a-z0-9]/g,'');
  const items=command.items.map(item=>{
    const matches=variants.filter(v=>v.product.slug===item.slug&&[v.name,v.size,v.concentration].some(size=>normalize(size)===normalize(item.size)));
    if(matches.length!==1) throw new Error(`Vial size must match exactly once: ${item.slug} / ${item.size}`);
    return {variantId:matches[0].id,quantity:item.quantity,lineTotal:item.lineTotal,additionalQuantity:item.additionalQuantity};
  });
  const saved=await prepareBulkRecap(command.requestId,{items,supplementalDocumentKeys:command.supplementalDocumentKeys,existingOrderNumber:command.existingOrderNumber,shippingAmount:command.shippingAmount,taxAmount:command.taxAmount,fulfillmentNote:command.fulfillmentNote,allowBackorder:command.allowBackorder},owner.id);
  if(!saved.recapDraft || saved.recapApprovedAt || saved.recapSentAt) throw new Error('Draft hold verification failed');
  console.log('Bulk recap draft saved and held for approval. No email sent. No order or inventory changed.');
}
main().catch(error=>{console.error('Bulk recap draft setup failed:',error instanceof Error?error.message:'Unknown error');process.exitCode=1}).finally(async()=>{if(process.env.BULK_RECAP_PREPARE_REQUEST && process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production") await db.$disconnect()});
