"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  FlaskConical,
  PackageCheck,
  SearchCheck,
} from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    icon: SearchCheck,
    title: "Review the research catalog",
    description:
      "Compare compounds, variants, availability, and published documentation.",
  },
  {
    number: "02",
    icon: FlaskConical,
    title: "Build your order",
    description:
      "Choose the exact variant and quantity with totals shown clearly in CAD.",
  },
  {
    number: "03",
    icon: Banknote,
    title: "Place and reference payment",
    description:
      "Receive precise Interac e-Transfer instructions tied to your order number.",
  },
  {
    number: "04",
    icon: PackageCheck,
    title: "Track Canadian fulfillment",
    description:
      "Payment confirmation and order status keep the process easy to follow.",
  },
];

export function OrderJourney() {
  return (
    <section className="relative overflow-hidden bg-navy-deep py-20 text-white sm:py-24">
      <div className="absolute inset-0 gradient-hero opacity-80" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      <motion.div
        aria-hidden
        animate={{ x: ["-10%", "10%", "-10%"], y: ["0%", "10%", "0%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan/20 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ x: ["10%", "-10%", "10%"], y: ["0%", "-8%", "0%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-teal-light/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-bright backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4" />
              Clear from discovery to delivery
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
              A purchasing process designed to feel effortless.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/70">
              Every step explains what happens next, what you are paying, and
              where to find the documentation you need.
            </p>
          </motion.div>

          <Link
            href="/shop"
            className="inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-navy-deep shadow-xl transition-all hover:-translate-y-0.5 hover:bg-cyan-bright hover:text-white"
          >
            Start exploring
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-r from-transparent via-cyan-bright/50 to-transparent lg:block" />
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -7 }}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur-md transition-colors hover:border-cyan-bright/30 hover:bg-white/[0.11]"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-bright to-cyan text-white shadow-lg shadow-cyan/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-3xl font-black text-white/10 transition-colors group-hover:text-cyan-bright/25">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-6 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {step.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
