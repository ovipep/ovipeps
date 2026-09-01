"use client";

import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductDetail } from "@/lib/products";
import type { FaqItem } from "@/generated/prisma/client";

const TAB_IDS = [
  "overview",
  "specifications",
  "research",
  "batch",
  "lab",
  "storage",
  "shipping",
  "faq",
] as const;

type TabId = (typeof TAB_IDS)[number];

interface ProductDetailTabsProps {
  product: ProductDetail;
  faqs: FaqItem[];
  researchDisclaimer: string;
  freeShippingMessage: string | null;
  hasCoa: boolean;
}

export function ProductDetailTabs({
  product,
  faqs,
  researchDisclaimer,
  freeShippingMessage,
  hasCoa,
}: ProductDetailTabsProps) {
  const visibleTabs = TAB_IDS.filter((tab) => {
    if (tab === "lab") return hasCoa;
    if (tab === "batch") return product.batches.length > 0;
    return true;
  });

  const [activeTab, setActiveTab] = useState<TabId>(visibleTabs[0] ?? "overview");

  return (
    <div className="mt-16">
      <div className="border-b border-border">
        <nav
          className="-mb-px flex gap-1 overflow-x-auto pb-px"
          aria-label="Product information"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-navy text-navy"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      <div className="py-8">
        {activeTab === "overview" && (
          <div className="prose prose-slate max-w-none">
            {product.description ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </div>
            ) : product.shortDescription ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Detailed product overview is not yet available for this compound.
              </p>
            )}
          </div>
        )}

        {activeTab === "specifications" && (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr className="bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    Product Name
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">{product.name}</td>
                </tr>
                {product.researchCategory && (
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-foreground">
                      Research Category
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.researchCategory}
                    </td>
                  </tr>
                )}
                {product.variants.map((variant) => (
                  <VariantSpecRows key={variant.id} variant={variant} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "research" && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Badge variant="research">Research Use Only</Badge>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {researchDisclaimer}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This product is intended exclusively for in-vitro research and
                laboratory use by qualified professionals. It is not approved for
                human consumption, medical treatment, veterinary use, or
                diagnostic purposes. Purchasers are responsible for compliance
                with applicable institutional and regulatory requirements.
              </p>
              {product.researchCategory && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Research area:
                  </span>{" "}
                  {product.researchCategory}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "batch" && product.batches.length > 0 && (
          <div className="space-y-4">
            {product.batches.map((batch) => (
              <Card key={batch.id}>
                <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Batch Number
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {batch.batchNumber}
                    </p>
                  </div>
                  {batch.lotNumber && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Lot Number
                      </p>
                      <p className="mt-1 font-mono text-sm text-foreground">
                        {batch.lotNumber}
                      </p>
                    </div>
                  )}
                  {batch.manufacturedAt && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Manufactured
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {formatDate(batch.manufacturedAt)}
                      </p>
                    </div>
                  )}
                  {batch.expiresAt && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Expires
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {formatDate(batch.expiresAt)}
                      </p>
                    </div>
                  )}
                  {batch.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Notes
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {batch.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "lab" && hasCoa && (
          <div className="space-y-4">
            {product.coaDocuments.map((coa) => (
              <Card key={coa.id}>
                <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Batch Number
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {coa.batchNumber}
                    </p>
                  </div>
                  {coa.lotNumber && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Lot Number
                      </p>
                      <p className="mt-1 font-mono text-sm text-foreground">
                        {coa.lotNumber}
                      </p>
                    </div>
                  )}
                  {coa.testingDate && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Testing Date
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {formatDate(coa.testingDate)}
                      </p>
                    </div>
                  )}
                  {coa.testingProvider && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Testing Provider
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {coa.testingProvider}
                      </p>
                    </div>
                  )}
                  {coa.purityResult && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Purity Result
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {coa.purityResult}
                      </p>
                    </div>
                  )}
                  {coa.resultSummary && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Result Summary
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {coa.resultSummary}
                      </p>
                    </div>
                  )}
                  {coa.documentUrl && (
                    <div className="sm:col-span-2">
                      <a
                        href={coa.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-accent hover:text-navy"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "storage" && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Research peptides are typically supplied in lyophilized powder
                form. General laboratory storage guidelines include refrigeration
                at 2–8°C for unopened vials, protection from light and moisture,
                and use of appropriate sterile diluent for reconstitution.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                For compound-specific handling guidance, refer to your
                institutional protocols and our{" "}
                <a href="/research/storage-handling" className="text-accent hover:text-navy">
                  Storage &amp; Handling guide
                </a>
                .
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === "shipping" && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Orders are fulfilled from within Canada. Processing typically
                begins within 1–2 business days after payment confirmation via
                Interac e-Transfer.
              </p>
              {freeShippingMessage && (
                <p className="text-sm font-medium text-navy">{freeShippingMessage}</p>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">
                Shipping times vary by province and carrier selection. Cold-chain
                or temperature-sensitive handling may apply to certain compounds.
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === "faq" && (
          <div className="space-y-4">
            {faqs.length > 0 ? (
              faqs.map((faq) => (
                <Card key={faq.id}>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-semibold text-foreground">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No frequently asked questions are available at this time.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VariantSpecRows({
  variant,
}: {
  variant: ProductDetail["variants"][number];
}) {
  return (
    <>
      <tr className="bg-muted/30">
        <th
          colSpan={2}
          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal"
        >
          {variant.name}
        </th>
      </tr>
      <tr>
        <th className="px-4 py-3 text-left font-medium text-foreground">SKU</th>
        <td className="px-4 py-3 font-mono text-muted-foreground">
          {variant.sku}
        </td>
      </tr>
      {variant.concentration && (
        <tr>
          <th className="px-4 py-3 text-left font-medium text-foreground">
            Concentration
          </th>
          <td className="px-4 py-3 text-muted-foreground">
            {variant.concentration}
          </td>
        </tr>
      )}
      {variant.size && (
        <tr>
          <th className="px-4 py-3 text-left font-medium text-foreground">
            Size
          </th>
          <td className="px-4 py-3 text-muted-foreground">{variant.size}</td>
        </tr>
      )}
      <tr>
        <th className="px-4 py-3 text-left font-medium text-foreground">
          Price (CAD)
        </th>
        <td className="px-4 py-3 text-muted-foreground">
          {variant.inStock ? `$${variant.price.toFixed(2)}` : "Restocking"}
        </td>
      </tr>
    </>
  );
}

const TAB_LABELS: Record<TabId, string> = {
  overview: "Overview",
  specifications: "Specifications",
  research: "Research Info",
  batch: "Batch Info",
  lab: "Lab Documentation",
  storage: "Storage",
  shipping: "Shipping",
  faq: "FAQ",
};
