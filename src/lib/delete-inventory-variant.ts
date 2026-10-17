import type { Prisma } from '@/generated/prisma/client';

export class InventoryDeletionError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

export async function deleteInventoryVariant(tx: Prisma.TransactionClient, id: string, sku: string, adminId: string) {
  const variant=await tx.productVariant.findUnique({where:{id},include:{product:{select:{slug:true}}}});
  if(!variant) throw new InventoryDeletionError('Inventory row not found',404);
  if(variant.sku!==sku) throw new InventoryDeletionError('This inventory row changed. Refresh and confirm the correct row.');
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${variant.productId} FOR UPDATE`;
  // Checkout reserves with an atomic variant update. Lock it before checking open orders.
  await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id=${id} FOR UPDATE`;
  const current=await tx.productVariant.findUniqueOrThrow({where:{id}});
  if(current.deletedAt) return {slug:variant.product.slug,alreadyDeleted:true};
  const openItems=await tx.orderItem.count({where:{variantId:id,order:{status:{in:['AWAITING_PAYMENT','PAYMENT_RECEIVED','PROCESSING']}}}});
  if(openItems) throw new InventoryDeletionError('This size is used by an open order. Complete or cancel those orders before deleting this row.');
  await tx.productVariant.update({where:{id},data:{deletedAt:new Date(),stockQuantity:0,inStock:false,isDefault:false}});
  const remaining=await tx.productVariant.findMany({where:{productId:variant.productId,deletedAt:null},orderBy:{sortOrder:'asc'},select:{id:true,isDefault:true}});
  if(!remaining.length) await tx.product.update({where:{id:variant.productId},data:{published:false}});
  else if(!remaining.some(v=>v.isDefault)) await tx.productVariant.update({where:{id:remaining[0].id},data:{isDefault:true}});
  await tx.auditLog.create({data:{userId:adminId,action:'DELETE_INVENTORY_VARIANT',entity:'ProductVariant',entityId:id,details:JSON.stringify({sku:current.sku,name:current.name,removedAvailableUnits:current.stockQuantity,productId:variant.productId})}});
  return {slug:variant.product.slug,alreadyDeleted:false};
}
