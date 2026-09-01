"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, FlaskConical, ShoppingBag, ShieldCheck, Zap } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import {
  getDefaultVariant,
  getLowestPrice,
  isProductInStock,
  type ProductCardData,
} from "@/types/product";

interface ProductCardProps {
  product: ProductCardData;
  hasCoa?: boolean;
  onQuickView?: (product: ProductCardData) => void;
  className?: string;
  index?: number;
}

export function ProductCard({
  product,
  hasCoa,
  onQuickView,
  className,
  index = 0,
}: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const lowestPrice = getLowestPrice(product.variants);
  const defaultVariant = getDefaultVariant(product.variants);
  const inStock = isProductInStock(product.variants);
  const availableVariant = product.variants.find((variant) => variant.inStock);
  const showCoa = hasCoa ?? product.hasCoa;
  const hasMultipleVariants = product.variants.length > 1;

  const handleAddToCart = (e: React.MouseEvent) => {
    if (hasMultipleVariants && !onQuickView) return;
    e.preventDefault();
    e.stopPropagation();
    if (hasMultipleVariants && onQuickView) {
      onQuickView(product);
      return;
    }
    if (!defaultVariant || !inStock) return;
    addItem({
      productId: product.id,
      variantId: defaultVariant.id,
      name: product.name,
      variantName: defaultVariant.name,
      price: defaultVariant.price,
      sku: defaultVariant.sku,
      stockQuantity: defaultVariant.stockQuantity,
      imageUrl: product.imageUrl ?? undefined,
    });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 4) * 0.08, duration: 0.5 }}
      whileHover={{ y: -8, transition: { duration: 0.25 } }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card card-shine",
        "shadow-sm hover:shadow-xl hover:shadow-sky/15 hover:border-sky/30",
        "transition-shadow duration-300",
        inStock && "border-emerald-400/80 ring-2 ring-emerald-300/30 shadow-lg shadow-emerald-200/40",
        className
      )}
    >
      {/* Gradient top accent */}
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky via-cyan to-teal-light transition-opacity duration-300", inStock ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />

      <Link href={`/shop/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-sky/5 via-transparent to-cyan/5">
          {product.imageUrl ? (
            <motion.div
              className="relative h-full w-full"
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-contain p-6 drop-shadow-md"
              />
            </motion.div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-sky/20 bg-white/70 text-sky shadow-sm">
                <FlaskConical className="h-10 w-10" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky/70">
                Product image coming soon
              </p>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {inStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                <Zap className="h-3 w-3" />
                Available Now
              </span>
            )}
            {showCoa && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-teal to-teal-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                <ShieldCheck className="h-3 w-3" />
                COA
              </span>
            )}
          </div>

          {/* Hover actions */}
          <div className="absolute inset-x-0 bottom-0 flex translate-y-0 gap-2 p-3 transition-transform duration-300 md:translate-y-full md:group-hover:translate-y-0">
            {onQuickView && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(product); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/95 py-2.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-sky/10"
              >
                <Eye className="h-3.5 w-3.5" />
                Quick View
              </button>
            )}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold shadow-lg transition-all",
                inStock
                  ? "bg-gradient-to-r from-sky to-cyan text-white hover:from-sky-bright hover:to-cyan-bright hover:shadow-sky/30"
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              )}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              {!inStock
                ? "Restocking"
                : hasMultipleVariants
                  ? "Choose Options"
                  : "Add to Cart"}
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-base font-bold leading-snug text-foreground transition-colors group-hover:text-sky">
            {product.name}
          </h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <p className="text-xl font-bold text-navy-deep">
              {!inStock ? "Restocking" : <>
              {hasMultipleVariants && (
                <span className="mr-1 text-xs font-normal text-muted-foreground">from</span>
              )}
              {formatCurrency(lowestPrice)}
              </>}
            </p>
            {inStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-bold uppercase text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                {`${availableVariant?.stockQuantity ?? "Limited"} Vials Left`}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
