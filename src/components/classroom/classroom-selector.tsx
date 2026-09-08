"use client";

import { ChevronDown } from "lucide-react";
import type { ClassroomNavDocument } from "@/lib/classroom";

export function ClassroomSelector({
  documents,
  currentSlug,
}: {
  documents: ClassroomNavDocument[];
  currentSlug: string;
}) {
  return (
    <label className="relative flex items-center gap-2 text-sm font-medium text-foreground">
      <span className="whitespace-nowrap">Choose peptide</span>
      <select
        value={currentSlug}
        onChange={(event) => {
          if (event.target.value !== currentSlug) {
            window.open(`/classroom/${event.target.value}`, "_blank", "noopener,noreferrer");
          }
        }}
        className="h-10 min-w-48 appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        aria-label="Choose another Classroom document"
      >
        {documents.map((item) => (
          <option key={item.id} value={item.slug}>
            {item.displayName}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
    </label>
  );
}
