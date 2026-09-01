import type { Metadata } from "next";
import { BulkOrderRequestForm } from "@/components/products/bulk-order-request-form";
import { PageHero } from "@/components/content/page-hero";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Bulk Order Requests",
  description: "Request discounted pricing and an ETA for OVIpeps research products by the kit.",
};

export default async function BulkOrderRequestsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const [{ product }, products] = await Promise.all([searchParams, getProducts()]);
  return <>
    <PageHero eyebrow="Volume Purchasing" title="Bulk Order Requests" description="Select the research products and kit quantities you need. One kit contains 10 units, and our team will reply within 24 hours with discounted pricing and an ETA." />
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <BulkOrderRequestForm products={products.map(({ id, name, slug }) => ({ id, name, slug }))} initialProductSlug={product} />
    </div>
  </>;
}
