"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, ShieldCheck, ExternalLink } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import {
  getDefaultVariant,
  getLowestPrice,
  isProductInStock,
  type ProductCardData,
  type ProductVariant,
} from "@/types/product";

interface QuickViewModalProps {
  product: ProductCardData | null;
  open: boolean;
  onClose: () => void;
  hasCoa?: boolean;
}

export function QuickViewModal({
  product,
  open,
  onClose,
  hasCoa,
}: QuickViewModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();

  useEffect(() => {
    if (product) {
      setSelectedVariant(getDefaultVariant(product.variants));
    }
  }, [product]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !product) return null;

  const showCoa = hasCoa ?? product.hasCoa;
  const inStock = selectedVariant?.inStock ?? isProductInStock(product.variants);
  const lowestPrice = getLowestPrice(product.variants);

  const handleAddToCart = () => {
    if (!selectedVariant || !selectedVariant.inStock) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      sku: selectedVariant.sku,
      stockQuantity: selectedVariant.stockQuantity,
      imageUrl: product.imageUrl ?? undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close quick view"
        className="absolute inset-0 bg-navy-deep/70 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-sky/20 bg-white shadow-2xl shadow-sky/20"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image panel */}
          <div className="relative aspect-square bg-gradient-to-br from-sky/5 via-white to-cyan/5 md:aspect-auto md:min-h-[420px]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-8"
                priority
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center">
                <div className="h-32 w-32 rounded-full border border-dashed border-muted-foreground/20" />
              </div>
            )}
            {showCoa && (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky to-cyan px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-sky/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                COA Available
              </span>
            )}
          </div>

          {/* Details panel */}
          <div className="flex flex-col p-6 md:p-8">
            {product.researchCategory && (
              <p className="text-xs font-medium uppercase tracking-widest text-teal">
                {product.researchCategory}
              </p>
            )}
            <h2
              id="quick-view-title"
              className="mt-1 text-2xl font-bold text-navy-deep"
            >
              {product.name}
            </h2>

            {product.shortDescription && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </p>
            )}

            <p className="mt-4 text-2xl font-semibold text-navy-deep">
              {!inStock
                ? "Restocking"
                : selectedVariant
                ? formatCurrency(selectedVariant.price)
                : formatCurrency(lowestPrice)}
            </p>

            {/* Variant selector */}
            {product.variants.length > 1 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Select Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={!variant.inStock}
                      onClick={() => setSelectedVariant(variant)}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                        selectedVariant?.id === variant.id
                          ? "border-navy bg-navy text-primary-foreground"
                          : variant.inStock
                            ? "border-border bg-background text-foreground hover:border-accent/40"
                            : "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                      )}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  inStock
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    inStock ? "bg-success" : "bg-muted-foreground"
                  )}
                />
                {inStock
                  ? `Available — ${selectedVariant?.stockQuantity ?? "limited"} vials left`
                  : "Restocking"}
              </span>
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-6">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || !selectedVariant}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all",
                  inStock
                    ? "bg-gradient-to-r from-sky to-cyan text-white shadow-lg shadow-sky/25 hover:shadow-xl hover:shadow-sky/35"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                <ShoppingBag className="h-4 w-4" />
                {inStock ? "Add to Cart" : "Restocking"}
              </button>
              <Link
                href={`/shop/${product.slug}`}
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
              >
                View Full Details
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
