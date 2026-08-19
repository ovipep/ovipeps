"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Quote, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Mattie H.",
    initials: "MH",
    quote:
      "Really impressed with the whole experience. Everything was straightforward, the packaging looked professional, and my order arrived exactly as expected. OVIpeps definitely feels like they care about quality.",
    gradient: "from-sky to-cyan",
  },
  {
    name: "Naomi Z.",
    initials: "NZ",
    quote:
      "First time ordering from OVIpeps and the process was super easy. Communication was clear, everything came well packaged, and I appreciated how simple the website was to navigate.",
    gradient: "from-cyan to-teal-light",
  },
  {
    name: "Gary N.",
    initials: "GN",
    quote:
      "I’ve checked out a few different peptide suppliers and OVIpeps stood out to me for how professional everything felt. Clean packaging, smooth ordering process, and great customer service.",
    gradient: "from-electric to-sky",
  },
  {
    name: "Dean G.",
    initials: "DG",
    quote:
      "Great experience from start to finish. Ordering was quick, shipping updates were helpful, and everything arrived securely packaged. I’ll definitely be keeping OVIpeps in mind for future research orders.",
    gradient: "from-teal-light to-teal",
  },
];

export function Testimonials() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="relative overflow-hidden py-20 sm:py-28"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-sky/5 to-background" />
      <motion.div
        aria-hidden
        animate={
          reduceMotion
            ? undefined
            : { x: ["-8%", "8%", "-8%"], scale: [1, 1.12, 1] }
        }
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-sky/10 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={
          reduceMotion
            ? undefined
            : { x: ["8%", "-8%", "8%"], scale: [1.1, 1, 1.1] }
        }
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-sky/15 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-sky shadow-sm backdrop-blur-sm">
            <Quote className="h-3.5 w-3.5" />
            Customer feedback
          </div>
          <h2
            id="testimonials-heading"
            className="mt-5 text-3xl font-black tracking-tight text-navy-deep sm:text-5xl"
          >
            An experience people{" "}
            <span className="gradient-text">remember.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            Thoughtful packaging, clear communication, and a straightforward
            ordering experience—from the first click onward.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.blockquote
              key={testimonial.name}
              initial={{ opacity: 0, y: 34, rotateX: 8 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-70px" }}
              transition={{
                duration: 0.55,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={reduceMotion ? undefined : { y: -7, scale: 1.01 }}
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-sky/10 bg-white/90 p-6 shadow-lg shadow-sky/5 backdrop-blur-sm transition-[border-color,box-shadow] hover:border-sky/25 hover:shadow-2xl hover:shadow-sky/12 sm:p-8"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${testimonial.gradient}`}
              />
              <Quote className="absolute -right-3 -top-3 h-28 w-28 rotate-12 text-sky/[0.045] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />

              <div
                className="flex gap-1 text-warning"
                aria-label="5 out of 5 stars"
              >
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <motion.span
                    key={starIndex}
                    initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: index * 0.08 + starIndex * 0.04 + 0.2,
                    }}
                  >
                    <Star
                      aria-hidden
                      className="h-4 w-4 fill-current drop-shadow-sm"
                    />
                  </motion.span>
                ))}
              </div>

              <p className="relative mt-5 flex-1 text-base leading-relaxed text-foreground/80 sm:text-lg">
                “{testimonial.quote}”
              </p>

              <footer className="relative mt-7 flex items-center gap-3 border-t border-sky/10 pt-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${testimonial.gradient} text-sm font-black text-white shadow-lg shadow-sky/15`}
                  aria-hidden
                >
                  {testimonial.initials}
                </div>
                <div>
                  <cite className="not-italic text-sm font-bold text-navy-deep">
                    {testimonial.name}
                  </cite>
                  <p className="text-xs text-muted-foreground">
                    OVIpeps customer
                  </p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
