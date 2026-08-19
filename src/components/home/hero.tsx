"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  ChevronDown,
  FileCheck2,
  FlaskConical,
  MapPin,
  Sparkles,
} from "lucide-react";
import { FloatingOrbs, FloatingParticles, MolecularRing } from "@/components/motion/floating-orbs";

const HERO_PRODUCTS = [
  {
    src: "/images/products/glp-3.png",
    alt: "GLP-3 / Retatrutide",
    delay: 0,
    position: "left-[25%] top-0 z-30 sm:left-[27%]",
    size: "h-[270px] w-[270px] sm:h-[330px] sm:w-[330px] lg:h-[360px] lg:w-[360px]",
    rotate: 0,
    float: 15,
  },
  {
    src: "/images/products/mots-c.png",
    alt: "MOTS-C",
    delay: 0.15,
    position: "-left-[7%] top-24 z-10 sm:-left-[2%] sm:top-28",
    size: "h-[205px] w-[205px] sm:h-[250px] sm:w-[250px] lg:h-[275px] lg:w-[275px]",
    rotate: -9,
    float: 11,
  },
  {
    src: "/images/products/klow.png",
    alt: "KLOW",
    delay: 0.3,
    position: "-right-[7%] top-20 z-20 sm:-right-[2%] sm:top-24",
    size: "h-[215px] w-[215px] sm:h-[260px] sm:w-[260px] lg:h-[285px] lg:w-[285px]",
    rotate: 9,
    float: 13,
  },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-1, 1], [7, -7]), {
    stiffness: 120,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-9, 9]), {
    stiffness: 120,
    damping: 20,
  });
  const clusterX = useSpring(useTransform(pointerX, [-1, 1], [-10, 10]), {
    stiffness: 120,
    damping: 22,
  });
  const clusterY = useSpring(useTransform(pointerY, [-1, 1], [-8, 8]), {
    stiffness: 120,
    damping: 22,
  });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1);
    pointerY.set(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section ref={ref} className="relative min-h-[94vh] overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-hero" />
      <FloatingOrbs />
      <FloatingParticles />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <MolecularRing className="absolute -right-32 top-1/4 h-[500px] w-[500px] text-cyan-bright/20" />
      <MolecularRing className="absolute -left-40 bottom-0 h-[400px] w-[400px] text-sky-bright/10" />

      <motion.div style={{ y, opacity, scale }} className="relative">
        <div className="mx-auto flex max-w-[90rem] flex-col items-center gap-10 px-4 pb-24 pt-16 sm:px-6 sm:pt-20 lg:min-h-[820px] lg:flex-row lg:gap-10 lg:px-8 lg:py-24">
          {/* Left content */}
          <div className="relative z-20 flex-1 text-center lg:max-w-[49%] lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-bright backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Canada&apos;s Premium Research Lab
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-teal-light animate-pulse" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
            >
              Precision Compounds.
              <br />
              <span className="gradient-text text-5xl font-black sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
                Built for Research.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-lg text-lg leading-relaxed text-white/75 lg:mx-0 mx-auto"
            >
              Explore premium research peptides with batch documentation, Canadian
              fulfillment, and a buying experience built for serious researchers.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start"
            >
              <Link
                href="/shop"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-8 py-4 text-sm font-bold text-navy-deep shadow-lg shadow-black/20 transition-all hover:scale-105 hover:shadow-xl hover:shadow-sky/30"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-sky-bright/0 via-sky-bright/20 to-sky-bright/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <FlaskConical className="h-4 w-4" />
                Explore Products
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/25 bg-white/10 px-8 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:border-cyan-bright/50 hover:bg-white/20 hover:scale-105"
              >
                About OVIpeps
              </Link>
            </motion.div>

            {/* Quick trust pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              {["Canadian Fulfillment", "Research Use Only", "Interac e-Transfer"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm"
                >
                  {pill}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — interactive product constellation */}
          <div
            className="relative flex w-full flex-1 items-center justify-center [perspective:1200px] lg:min-w-0"
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPointer}
          >
            <motion.div
              style={
                reduceMotion
                  ? undefined
                  : {
                      rotateX,
                      rotateY,
                      x: clusterX,
                      y: clusterY,
                      transformStyle: "preserve-3d",
                    }
              }
              className="relative h-[390px] w-full max-w-[580px] sm:h-[470px] lg:h-[520px]"
            >
              {/* Dimensional energy field */}
              <motion.div
                aria-hidden
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                className="absolute left-1/2 top-[45%] h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-bright/25 sm:h-[440px] sm:w-[440px]"
              />
              <motion.div
                aria-hidden
                animate={reduceMotion ? undefined : { rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute left-1/2 top-[45%] h-[285px] w-[285px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 sm:h-[350px] sm:w-[350px]"
              >
                {[0, 90, 180, 270].map((rotation) => (
                  <span
                    key={rotation}
                    className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-cyan-bright shadow-[0_0_16px_rgba(34,211,238,.9)]"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${rotation}deg) translateX(142px)`,
                    }}
                  />
                ))}
              </motion.div>

              <div
                aria-hidden
                className="absolute left-1/2 top-[46%] h-[300px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky/35 via-cyan-bright/25 to-teal-light/30 blur-[70px] animate-pulse-glow"
              />
              <div
                aria-hidden
                className="absolute inset-x-[12%] bottom-8 h-16 rounded-[100%] bg-black/35 blur-2xl"
              />

              {HERO_PRODUCTS.map((product, i) => (
                <motion.div
                  key={product.alt}
                  initial={{ opacity: 0, y: 80, scale: 0.65, rotate: product.rotate }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: product.rotate }}
                  transition={{
                    type: "spring",
                    damping: 16,
                    stiffness: 90,
                    delay: 0.25 + product.delay,
                  }}
                  className={`absolute ${product.position}`}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <motion.div
                    animate={
                      reduceMotion
                        ? undefined
                        : {
                            y: [0, -product.float, 0],
                            rotateZ: [
                              product.rotate,
                              product.rotate + (i === 1 ? -1.5 : 1.5),
                              product.rotate,
                            ],
                          }
                    }
                    transition={{
                      duration: 4.5 + i * 0.7,
                      delay: product.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    whileHover={{ scale: 1.07, rotateZ: 0, z: 45 }}
                    className="group relative"
                  >
                    <div className="absolute -inset-6 rounded-[2.5rem] bg-cyan-bright/25 opacity-80 blur-3xl transition-opacity group-hover:opacity-100" />
                    <div
                      className={`relative overflow-hidden rounded-[2rem] border border-white/35 bg-white shadow-[0_30px_70px_rgba(0,0,0,.42),0_0_45px_rgba(34,211,238,.22)] ${product.size}`}
                    >
                      <Image
                        src={product.src}
                        alt={`${product.alt} research product vial`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes={i === 0 ? "(max-width: 640px) 270px, 360px" : "(max-width: 640px) 215px, 285px"}
                        priority={i === 0}
                      />
                      <div className="pointer-events-none absolute left-[29%] right-[29%] top-[69%] flex h-[8%] items-center justify-center border-y border-slate-200 bg-white/95 text-center text-[5px] font-black tracking-tight text-teal sm:text-[7px]">
                        BATCH-SPECIFIC COA
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-sky/10 via-transparent to-white/35 mix-blend-soft-light" />
                      <motion.div
                        aria-hidden
                        animate={reduceMotion ? undefined : { x: ["-160%", "220%"] }}
                        transition={{
                          duration: 3.8,
                          delay: i * 0.7,
                          repeat: Infinity,
                          repeatDelay: 2.5,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                      />
                    </div>
                  </motion.div>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="absolute right-0 top-2 z-40 hidden items-center gap-2 rounded-2xl border border-white/20 bg-navy-deep/65 px-3 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-xl sm:flex"
              >
                <FileCheck2 className="h-4 w-4 text-cyan-bright" />
                Published COA status
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.15 }}
                className="absolute bottom-12 left-0 z-40 hidden items-center gap-2 rounded-2xl border border-white/20 bg-navy-deep/65 px-3 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-xl sm:flex"
              >
                <MapPin className="h-4 w-4 text-teal-light" />
                Fulfilled in Canada
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-white/50"
        >
          <span className="text-[10px] font-medium uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.div>

      {/* Bottom wave fade */}
      <div className="absolute inset-x-0 bottom-0">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full" preserveAspectRatio="none">
          <path
            d="M0 80V40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0Z"
            fill="var(--background)"
          />
        </svg>
      </div>
    </section>
  );
}
