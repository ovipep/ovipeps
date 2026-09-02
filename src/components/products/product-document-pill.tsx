"use client";

import { FileText } from "lucide-react";
import { CJC_IPAMORELIN_GUIDE } from "@/lib/product-documents";
import { cn } from "@/lib/utils";

interface ProductDocumentPillProps {
  className?: string;
  insideProductLink?: boolean;
}

const pillClasses =
  "inline-flex cursor-pointer items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:from-violet-500 hover:to-fuchsia-400 hover:shadow-lg hover:shadow-violet-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";

export function ProductDocumentPill({
  className,
  insideProductLink = false,
}: ProductDocumentPillProps) {
  if (insideProductLink) {
    return (
      <button
        type="button"
        className={cn(pillClasses, className)}
        aria-label={`Open ${CJC_IPAMORELIN_GUIDE.label} in a new tab`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.open(
            CJC_IPAMORELIN_GUIDE.url,
            "_blank",
            "noopener,noreferrer"
          );
        }}
      >
        <FileText className="h-3 w-3" aria-hidden="true" />
        {CJC_IPAMORELIN_GUIDE.label}
      </button>
    );
  }

  return (
    <a
      href={CJC_IPAMORELIN_GUIDE.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(pillClasses, className)}
      aria-label={`Open ${CJC_IPAMORELIN_GUIDE.label} in a new tab`}
    >
      <FileText className="h-3 w-3" aria-hidden="true" />
      {CJC_IPAMORELIN_GUIDE.label}
    </a>
  );
}
