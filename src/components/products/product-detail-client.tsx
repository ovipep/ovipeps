"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Minus, Plus, ShoppingBag } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import {
  getDefaultVariant,
  type ProductVariant,
} from "@/types/product";

interface ProductDetailClientProps {
  productId: string;
  productName: string;
  imageUrl?: string | null;
  variants: ProductVariant[];
}

export function ProductDetailClient({
  productId,
  productName,
  imageUrl,
  variants,
}: ProductDetailClientProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedVariant(getDefaultVariant(variants));
    setQuantity(1);
  }, [variants]);

  const inStock = selectedVariant?.inStock ?? false;
  const stockQuantity = selectedVariant?.stockQuantity ?? 0;
  const hasMultipleVariants = variants.length > 1;

  const handleAddToCart = () => {
    if (!selectedVariant || !inStock) return;

    addItem({
      productId,
      variantId: selectedVariant.id,
      name: productName,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      sku: selectedVariant.sku,
      stockQuantity: selectedVariant.stockQuantity,
      imageUrl: imageUrl ?? undefined,
      quantity,
    });
  };

  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));
  const incrementQuantity = () =>
    setQuantity((q) => Math.min(stockQuantity, q + 1));

  return (
    <div className="space-y-6">
      {selectedVariant && (
        <div>
          <p className="text-3xl font-semibold tracking-tight text-navy-deep">
            {inStock ? formatCurrency(selectedVariant.price) : "Restocking"}
          </p>
          {hasMultipleVariants && (
            <p className="mt-1 text-sm text-muted-foreground">
              SKU: {selectedVariant.sku}
            </p>
          )}
        </div>
      )}

      {hasMultipleVariants && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Select Variant
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariant(variant)}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                  selectedVariant?.id === variant.id
                    ? "border-navy bg-navy text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:border-accent/40 hover:shadow-sm",
                  !variant.inStock && "opacity-70"
                )}
              >
                {variant.name}
                {!variant.inStock ? " · Restocking" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {inStock && <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Quantity
        </span>
        <div
          className={cn(
            "inline-flex items-center rounded-lg border border-border",
            !inStock && "opacity-50"
          )}
        >
          <button
            type="button"
            onClick={decrementQuantity}
            disabled={!inStock || quantity <= 1}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="flex h-10 w-12 items-center justify-center border-x border-border text-sm font-semibold">
            {quantity}
          </span>
          <button
            type="button"
            onClick={incrementQuantity}
            disabled={!inStock || quantity >= stockQuantity}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>}

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            inStock
              ? "bg-success/10 text-success"
              : "bg-amber-100 text-amber-900"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              inStock ? "bg-success" : "bg-amber-600"
            )}
          />
          {inStock
            ? `Available now — only ${stockQuantity} vials in stock`
            : "Restocking"}
        </span>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={handleAddToCart}
        disabled={!inStock || !selectedVariant}
      >
        <ShoppingBag className="h-4 w-4" />
        {inStock ? "Add to Cart" : "Restocking"}
      </Button>

      {!inStock && (
        <div className="rounded-xl border border-sky/15 bg-sky/5 p-4">
          <p className="text-sm text-muted-foreground">
            Want updates when this compound returns? Reach out and we&apos;ll help with
            availability questions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="mailto:ovipeps@gmail.com"
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              <Mail className="h-4 w-4" />
              ovipeps@gmail.com
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Contact form
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
