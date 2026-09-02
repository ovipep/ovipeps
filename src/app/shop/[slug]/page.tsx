import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  FileCheck2,
  MapPin,
  PackagePlus,
  ShieldCheck,
  Truck,
} from "lucide-react";
import {
  getProductBySlug,
  getProductFaqs,
  getRelatedProducts,
  getSiteSetting,
  type ProductDetail,
} from "@/lib/products";
import { ProductDetailClient } from "@/components/products/product-detail-client";
import { ProductDetailTabs } from "@/components/products/product-detail-tabs";
import { ProductCard } from "@/components/products/product-card";
import { ProductGrid } from "@/components/products/product-grid";
import { Badge } from "@/components/ui/badge";
import { getLowestPrice, type ProductVariant } from "@/types/product";
import { formatCurrency } from "@/lib/utils";
import { hasCjcIpamorelinGuide } from "@/lib/product-documents";
import { ProductDocumentPill } from "@/components/products/product-document-pill";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

function mapDetailVariants(
  variants: ProductDetail["variants"]
): ProductVariant[] {
  return variants.map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku,
    price: v.price,
    inStock: v.inStock,
    stockQuantity: v.stockQuantity,
    isDefault: v.isDefault,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found | OVIpeps" };
  }

  return {
    title: product.metaTitle ?? `${product.name} | OVIpeps`,
    description:
      product.metaDescription ??
      product.shortDescription ??
      `Research-grade ${product.name} for laboratory use. Canadian fulfillment.`,
    openGraph: {
      title: product.metaTitle ?? product.name,
      description: product.metaDescription ?? product.shortDescription ?? undefined,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const [relatedProducts, faqs, researchDisclaimer, freeShippingMessage] =
    await Promise.all([
      getRelatedProducts(product.id, product.researchCategory),
      getProductFaqs(),
      getSiteSetting("research_disclaimer"),
      getSiteSetting("free_shipping_message"),
    ]);

  const variants = mapDetailVariants(product.variants);
  const hasCoa = product.coaDocuments.length > 0;
  const lowestPrice = getLowestPrice(variants);
  const inStock = variants.some((variant) => variant.inStock);
  const disclaimer =
    researchDisclaimer ??
    "All products are sold for research purposes only. Not intended for human consumption.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? product.shortDescription,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    sku: product.variants[0]?.sku,
    brand: {
      "@type": "Brand",
      name: "OVIpeps",
    },
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      sku: variant.sku,
      name: variant.name,
      price: variant.price,
      priceCurrency: "CAD",
      availability: variant.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `https://ovipeps.ca/shop/${product.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="border-b border-sky/10 bg-gradient-to-b from-sky/5 via-cyan/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-sky"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-sky/15 bg-gradient-to-br from-sky/5 via-white to-cyan/5 shadow-xl shadow-sky/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.08),transparent_50%)]" />
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-10 transition-transform duration-500 hover:scale-105"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="h-40 w-40 rounded-full border border-dashed border-sky/20" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {hasCoa && (
                <Badge variant="coa" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  COA Available
                </Badge>
              )}
              {hasCjcIpamorelinGuide(product.slug) && (
                <ProductDocumentPill />
              )}
              {product.researchCategory && (
                <Badge variant="research">{product.researchCategory}</Badge>
              )}
            </div>
          </div>

          {/* Purchase panel */}
          <div className="flex flex-col">
            {product.researchCategory && (
              <p className="text-xs font-medium uppercase tracking-widest text-teal">
                {product.researchCategory}
              </p>
            )}
            <h1 className="mt-1 bg-gradient-to-r from-navy-deep via-sky to-cyan bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              {product.name}
            </h1>

            {product.shortDescription && (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </p>
            )}

            {variants.length === 1 && inStock && (
              <p className="mt-6 text-3xl font-semibold text-navy-deep">
                {formatCurrency(lowestPrice)}
              </p>
            )}

            <div className="mt-8">
              <ProductDetailClient
                productId={product.id}
                productName={product.name}
                imageUrl={product.imageUrl}
                variants={variants}
              />
            </div>

            <Link href={`/bulk-order-requests?product=${encodeURIComponent(product.slug)}`} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-sky/30 bg-white px-5 text-sm font-semibold text-navy-deep transition hover:border-sky/50 hover:bg-sky/5">
              <PackagePlus className="h-4 w-4 text-sky" /> Bulk Order Requests
            </Link>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                {
                  icon: MapPin,
                  title: "Canada",
                  detail: "Domestic fulfillment",
                },
                {
                  icon: Truck,
                  title: "Tracked",
                  detail: "Order updates",
                },
                {
                  icon: FileCheck2,
                  title: hasCoa ? "COA listed" : "Clear status",
                  detail: hasCoa ? "Batch documentation" : "No hidden claims",
                },
              ].map(({ icon: Icon, title, detail }) => (
                <div
                  key={title}
                  className="rounded-xl border border-sky/10 bg-gradient-to-br from-sky/5 to-cyan/5 p-3 text-center"
                >
                  <Icon className="mx-auto h-4 w-4 text-sky" />
                  <p className="mt-1.5 text-xs font-bold text-navy-deep">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                    {detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Research Use Only
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {disclaimer}
              </p>
            </div>
          </div>
        </div>

        <ProductDetailTabs
          product={product}
          faqs={faqs}
          researchDisclaimer={disclaimer}
          freeShippingMessage={freeShippingMessage}
          hasCoa={hasCoa}
        />

        {relatedProducts.length > 0 && (
          <section className="mt-20 border-t border-border pt-16">
            <h2 className="text-2xl font-semibold text-navy-deep">
              Related Products
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Other compounds in{" "}
              {product.researchCategory ?? "our research catalog"}.
            </p>
            <ProductGrid className="mt-8">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </ProductGrid>
          </section>
        )}
      </div>
    </>
  );
}
