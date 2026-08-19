"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FlaskConical } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

const MARQUEE_ITEMS = [
  "Canadian Fulfillment",
  "Restocking Soon",
  "Interac e-Transfer",
  "Research Use Only",
  "Fast Support",
  "Clear Checkout",
  "Lab-Grade Compounds",
];

export function MarqueeBanner() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="relative overflow-hidden border-y border-border/50 bg-card py-3">
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="mx-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5 text-sky" />
            {item}
            <span className="text-sky/40">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function CtaBanner() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 bg-gradient-to-r from-sky/5 via-cyan/5 to-teal-light/5" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden rounded-3xl border border-sky/20 bg-gradient-to-br from-navy-deep via-navy to-sky/90 p-10 sm:p-16"
          >
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-cyan-bright/20 blur-3xl animate-pulse-glow" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-sky/20 blur-3xl" />

            <div className="relative flex flex-col items-center text-center lg:flex-row lg:text-left lg:items-center lg:justify-between gap-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-bright">
                  Catalog Preview
                </p>
                <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                  Premium Research
                  <br />
                  <span className="gradient-text">Compounds Coming Back</span>
                </h2>
                <p className="mt-3 max-w-md text-base text-white/70">
                  Browse the catalog while we restock. Contact us for availability updates or procurement questions.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/shop"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-navy-deep shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
                >
                  Browse Catalog
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/25 px-8 py-4 text-sm font-bold text-white transition-all hover:border-white/50 hover:bg-white/10"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}
