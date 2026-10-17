/** Optional, one-time production draft preparation. Never approves, sends, or reserves stock. */
import { z } from 'zod';
import { db } from '../src/lib/db';
import { prepareBulkRecap } from '../src/lib/bulk-checkout';

async function main() {
  const raw=process.env.BULK_RECAP_PREPARE_REQUEST;
  if(!raw || process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'production') return;
  const command=z.object({requestId:z.string().min(1),existingOrderNumber:z.string().min(1),items:z.array(z.object({slug:z.string(),size:z.string(),quantity:z.number().int().positive(),lineTotal:z.number().positive()})).min(1),shippingAmount:z.number().nonnegative(),taxAmount:z.number().nonnegative(),fulfillmentNote:z.string().min(1),allowBackorder:z.boolean()}).parse(JSON.parse(raw));
  const request=await db.bulkOrderRequest.findUniqueOrThrow({where:{id:command.requestId}});
  if(request.checkoutPlan || request.recapApprovedAt || request.orderId) {
    console.log('Bulk recap setup skipped: draft or order already exists.');return;
  }
  const owner=await db.user.findFirst({where:{email:{equals:'ovipeps@gmail.com',mode:'insensitive'},role:'ADMIN'},select:{id:true}});
  if(!owner) throw new Error('Owner administrator is required for draft preparation');
  const variants=await db.productVariant.findMany({where:{product:{slug:{in:command.items.map(i=>i.slug)}}},include:{product:{select:{slug:true}}}});
  const normalize=(value:string|null)=>value?.toLowerCase().replace(/[^a-z0-9]/g,'');
  const items=command.items.map(item=>{
    const matches=variants.filter(v=>v.product.slug===item.slug&&[v.name,v.size,v.concentration].some(size=>normalize(size)===normalize(item.size)));
    if(matches.length!==1) throw new Error(`Vial size must match exactly once: ${item.slug} / ${item.size}`);
    return {variantId:matches[0].id,quantity:item.quantity,lineTotal:item.lineTotal};
  });
  const saved=await prepareBulkRecap(command.requestId,{items,existingOrderNumber:command.existingOrderNumber,shippingAmount:command.shippingAmount,taxAmount:command.taxAmount,fulfillmentNote:command.fulfillmentNote,allowBackorder:command.allowBackorder},owner.id);
  if(!saved.recapDraft || saved.recapApprovedAt || saved.recapSentAt) throw new Error('Draft hold verification failed');
  console.log('Bulk recap draft saved and held for approval. No email sent. No order or inventory changed.');
}
main().catch(error=>{console.error('Bulk recap draft setup failed:',error instanceof Error?error.message:'Unknown error');process.exitCode=1}).finally(async()=>{if(process.env.BULK_RECAP_PREPARE_REQUEST && process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production") await db.$disconnect()});
