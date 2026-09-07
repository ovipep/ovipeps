"use client";

import { ShieldCheck } from "lucide-react";
import { getProductCoaDocument } from "@/lib/product-documents";
import { cn } from "@/lib/utils";

interface ProductCoaPillProps {
  productSlug: string;
  className?: string;
  insideProductLink?: boolean;
}

const pillClasses =
  "inline-flex cursor-pointer items-center gap-1 rounded-full bg-gradient-to-r from-teal to-teal-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2";

export function ProductCoaPill({
  productSlug,
  className,
  insideProductLink = false,
}: ProductCoaPillProps) {
  const coa = getProductCoaDocument(productSlug);
  if (!coa) return null;

  if (insideProductLink) {
    return (
      <button
        type="button"
        className={cn(pillClasses, className)}
        aria-label={`Open ${coa.label} PDF in a new tab`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.open(coa.url, "_blank", "noopener,noreferrer");
        }}
      >
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        {coa.label}
      </button>
    );
  }

  return (
    <a
      href={coa.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(pillClasses, className)}
      aria-label={`Open ${coa.label} PDF in a new tab`}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      {coa.label}
    </a>
  );
}
