import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Prisma} from '../src/generated/prisma/client';
import {deleteInventoryVariant} from '../src/lib/delete-inventory-variant';
function fixture(open=0,last=false) {
 const row:any={id:'v40',productId:'cjc',name:'40mg',sku:'CJC-40',stockQuantity:2,deletedAt:null,isDefault:true,product:{slug:'cjc-ipamorelin'}};
 const other:any={id:'v10',isDefault:false};const audits:any[]=[];let hidden=false;
 const tx={ $queryRaw:async()=>[],productVariant:{findUnique:async()=>row,findUniqueOrThrow:async()=>row,findMany:async()=>last?[]:[other],update:async({where,data}:any)=>Object.assign(where.id===row.id?row:other,data)},orderItem:{count:async()=>open},product:{update:async()=>{hidden=true}},auditLog:{create:async({data}:any)=>{audits.push(data);return data}}} as unknown as Prisma.TransactionClient;
 return {tx,row,other,audits,hidden:()=>hidden};
}
test('deleting a size removes its live inventory, keeps its historical identity, and selects another default',async()=>{
 const f=fixture();await deleteInventoryVariant(f.tx,'v40','CJC-40','admin');
 assert.ok(f.row.deletedAt);assert.equal(f.row.stockQuantity,0);assert.equal(f.row.inStock,false);assert.equal(f.row.sku,'CJC-40');assert.equal(f.other.isDefault,true);assert.equal(f.audits.length,1);
 await deleteInventoryVariant(f.tx,'v40','CJC-40','admin');assert.equal(f.audits.length,1);
});
test('open orders prevent deleting the vial size they need',async()=>{
 const f=fixture(1);await assert.rejects(()=>deleteInventoryVariant(f.tx,'v40','CJC-40','admin'),/open order/);
 assert.equal(f.row.deletedAt,null);assert.equal(f.row.stockQuantity,2);assert.equal(f.audits.length,0);
});
test('confirmation for another SKU cannot delete this row',async()=>{
 const f=fixture();await assert.rejects(()=>deleteInventoryVariant(f.tx,'v40','CJC-10','admin'),/changed/);assert.equal(f.row.deletedAt,null);
});
test('deleting the last size hides the product from the shop',async()=>{
 const f=fixture(0,true);
 await deleteInventoryVariant(f.tx,'v40','CJC-40','admin');assert.equal(f.hidden(),true);
});
