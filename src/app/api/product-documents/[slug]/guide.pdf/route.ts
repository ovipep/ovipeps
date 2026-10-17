import {productGuidePdf} from '@/lib/product-guide-pdf';
import {PRODUCT_DOCUMENTS} from '@/lib/product-documents';
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;
 if(!PRODUCT_DOCUMENTS[slug]) return new Response('Not found',{status:404});
 const pdf=await productGuidePdf(slug);
 return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${slug}-guide.pdf"`,'Cache-Control':'public, max-age=3600'}});
}
