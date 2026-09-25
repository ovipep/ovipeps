"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MegaMenuLink {
  label: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
}

export interface MegaMenuSection {
  title: string;
  links: MegaMenuLink[];
}

interface MegaMenuProps {
  label: string;
  sections: MegaMenuSection[];
  featured?: {
    title: string;
    description: string;
    href: string;
    cta: string;
  };
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  className?: string;
}

export function MegaMenu({
  label,
  sections,
  featured,
  isOpen,
  onOpen,
  onClose,
  className,
}: MegaMenuProps) {
  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => (isOpen ? onClose() : onOpen())}
        className={cn(
          "flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
          isOpen
            ? "bg-gradient-to-r from-sky/15 to-cyan/15 text-sky shadow-sm"
            : "text-foreground/80 hover:bg-sky/10 hover:text-sky"
        )}
      >
        {label}
        <svg
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-12 z-50 mx-auto max-h-[calc(100dvh-4rem)] w-auto max-w-[44rem] overflow-y-auto overscroll-contain"
          >
            <div className="overflow-hidden rounded-2xl border border-sky/20 bg-white/95 shadow-2xl shadow-sky/15 backdrop-blur-xl">
              <div className="grid gap-0 md:grid-cols-[1fr_auto]">
                <div className="grid gap-6 p-6 sm:grid-cols-2">
                  {sections.map((section) => (
                    <div key={section.title}>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-sky">
                        {section.title}
                      </p>
                      <ul className="space-y-0.5">
                        {section.links.map((link) => {
                          const Icon = link.icon;
                          return (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                onClick={onClose}
                                className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-all hover:bg-gradient-to-r hover:from-sky/10 hover:to-cyan/5"
                              >
                                {Icon && (
                                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky/10 to-cyan/10 text-sky transition-all group-hover:from-sky group-hover:to-cyan group-hover:text-white group-hover:shadow-md group-hover:shadow-sky/25">
                                    <Icon className="h-4 w-4" />
                                  </span>
                                )}
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-foreground group-hover:text-sky">
                                    {link.label}
                                  </span>
                                  {link.description && (
                                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                                      {link.description}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>

                {featured && (
                  <div className="relative overflow-hidden border-t border-sky/10 bg-gradient-to-br from-navy-deep via-navy to-sky p-6 text-white md:w-60 md:border-l md:border-t-0">
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan/20 blur-2xl" />
                    <p className="relative text-[10px] font-bold uppercase tracking-widest text-cyan-bright">
                      Featured
                    </p>
                    <h3 className="relative mt-2 text-base font-bold leading-snug">
                      {featured.title}
                    </h3>
                    <p className="relative mt-2 text-sm leading-relaxed text-white/75">
                      {featured.description}
                    </p>
                    <Link
                      href={featured.href}
                      onClick={onClose}
                      className="relative mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25"
                    >
                      {featured.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
