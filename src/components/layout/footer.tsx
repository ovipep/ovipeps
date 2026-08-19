import Link from "next/link";
import {
  FileCheck,
  FlaskConical,
  Mail,
  MapPin,
  Microscope,
  Package,
  Shield,
} from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";

const shopLinks = [
  { label: "All Products", href: "/shop" },
  { label: "Featured", href: "/shop?filter=featured" },
  { label: "New Arrivals", href: "/shop?filter=new" },
  { label: "Research Peptides", href: "/shop?category=research-peptides" },
  { label: "Lab Supplies", href: "/shop?category=supplies" },
  { label: "Bundles", href: "/shop?category=bundles" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Shipping", href: "/shipping" },
  { label: "Payment Instructions", href: "/payment-instructions" },
  { label: "Affiliate Program", href: "/affiliates" },
  { label: "Account", href: "/account" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Shipping Policy", href: "/shipping" },
  { label: "Returns & Refunds", href: "/returns" },
];

const supportLinks = [
  { label: "Contact Us", href: "/contact" },
  { label: "Account", href: "/account" },
  { label: "Terms", href: "/terms" },
];

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-bright/90">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-white/60 transition-all hover:translate-x-0.5 hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-navy-deep via-navy to-sky/90 text-white">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, rgba(6,182,212,0.35) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.25) 0%, transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block">
              <BrandMark theme="dark" size="lg" showTagline />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Premium research peptides and laboratory supplies with published
              batch documentation where available. Fulfilled from within Canada.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
              <MapPin className="h-4 w-4 shrink-0 text-cyan-bright" />
              <span className="text-sm font-semibold text-white/90">
                Proudly Canadian
              </span>
            </div>
          </div>

          <FooterLinkGroup title="Shop" links={shopLinks} />
          <FooterLinkGroup title="Company" links={companyLinks} />
          <FooterLinkGroup title="Legal" links={legalLinks} />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: FlaskConical,
              title: "Research Use Only",
              desc: "All products are sold for research purposes only. Not for human or veterinary consumption.",
            },
            {
              icon: Shield,
              title: "Quality Assured",
              desc: "Independent third-party testing with certificates of analysis available for documented batches.",
            },
            {
              icon: Mail,
              title: "Support",
              desc: null,
              email: "support@ovipeps.ca",
            },
          ].map(({ icon: Icon, title, desc, email }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-cyan">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">{title}</p>
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="mt-1 text-sm text-cyan-bright hover:underline"
                  >
                    {email}
                  </a>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{desc}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-white/45">
            &copy; {year} OVIpeps. All rights reserved. Prices in CAD.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {supportLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-white/50 transition-colors hover:text-cyan-bright"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 text-white/25">
            <Microscope className="h-4 w-4" />
            <Package className="h-4 w-4" />
            <FileCheck className="h-4 w-4" />
            <Shield className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-6 flex justify-center border-t border-white/5 pt-6">
          <p className="text-xs text-white/40">
            Made with{" "}
            <span className="text-red-400" aria-label="love">
              ❤️
            </span>{" "}
            by{" "}
            <a
              href="https://www.danielziedins.design"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-cyan-bright transition-colors hover:text-white hover:underline"
            >
              DanielZiedins.Design
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
