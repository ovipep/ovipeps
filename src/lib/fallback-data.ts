import type { ProductCardData } from "@/types/product";

/** Static catalog used when production database is not yet configured */
export const FALLBACK_PRODUCTS: ProductCardData[] = [
  {
    id: "fb-glp3",
    name: "GLP-3 / Retatrutide",
    slug: "glp-3",
    imageUrl: "/images/products/glp-3.png",
    researchCategory: "Metabolic Research",
    shortDescription: "Advanced metabolic research compound",
    hasCoa: true,
    isNew: true,
    featured: true,
    variants: [
      { id: "v1", name: "5mg", sku: "GLP3-5MG", price: 149.99, inStock: false, isDefault: true },
      { id: "v2", name: "10mg", sku: "GLP3-10MG", price: 249.99, inStock: false },
    ],
  },
  {
    id: "fb-klow",
    name: "KLOW",
    slug: "klow",
    imageUrl: "/images/products/klow.png",
    researchCategory: "Recovery Research",
    featured: true,
    variants: [{ id: "v3", name: "80mg", sku: "KLOW-80MG", price: 219.99, inStock: false, isDefault: true }],
  },
  {
    id: "fb-5amq",
    name: "5-Amino-1MQ",
    slug: "5-amino-1mq",
    imageUrl: "/images/products/5-amino-1mq.png",
    researchCategory: "Metabolic Research",
    featured: true,
    variants: [
      { id: "v4", name: "5mg", sku: "5AMQ-5MG", price: 84.99, inStock: false, isDefault: true },
      { id: "v5", name: "50mg", sku: "5AMQ-50MG", price: 299.99, inStock: false },
    ],
  },
  {
    id: "fb-glow",
    name: "GLOW",
    slug: "glow",
    imageUrl: "/images/products/glow.png",
    researchCategory: "Tissue Research",
    featured: true,
    variants: [{ id: "v6", name: "10mg", sku: "GLOW-10MG", price: 129.99, inStock: false, isDefault: true }],
  },
  {
    id: "fb-kpv",
    name: "KPV",
    slug: "kpv",
    imageUrl: "/images/products/kpv.png",
    researchCategory: "Peptide Research",
    variants: [{ id: "v7", name: "10mg", sku: "KPV-10MG", price: 69.99, inStock: false, isDefault: true }],
  },
  {
    id: "fb-motsc",
    name: "MOTS-C",
    slug: "mots-c",
    imageUrl: "/images/products/mots-c.png",
    researchCategory: "Metabolic Research",
    isNew: true,
    featured: true,
    variants: [
      { id: "v8", name: "10mg", sku: "MOTSC-10MG", price: 64.99, inStock: false, isDefault: true },
      { id: "v9", name: "40mg", sku: "MOTSC-40MG", price: 189.99, inStock: false },
    ],
  },
  {
    id: "fb-wolv",
    name: "BPC-157 / TB-500 (Wolverine Stack)",
    slug: "bpc157-tb500",
    imageUrl: "/images/products/bpc157-tb500.png",
    researchCategory: "Recovery Research",
    featured: true,
    variants: [{ id: "v10", name: "10mg/10mg", sku: "WOLV-10-10", price: 179.99, inStock: false, isDefault: true }],
  },
];

export const FALLBACK_SETTINGS: Record<string, string> = {
  research_disclaimer: "All products are sold for research purposes only. Not intended for human consumption.",
  shipping_threshold: "300",
  free_shipping_message: "Free shipping on orders over $300 CAD",
  etransfer_email: "orders@ovipeps.ca",
  etransfer_instructions:
    "Send your Interac e-Transfer after placing an order and include the unique order number in the message field.",
  trust_1_title: "Canadian Fulfillment",
  trust_1_desc: "Orders fulfilled from within Canada",
  trust_3_title: "Secure Order Process",
  trust_3_desc: "Clear e-Transfer steps and order references",
  trust_4_title: "Research Use Only",
  trust_4_desc: "Clear product communication for laboratory use",
  trust_5_title: "Fast Support",
  trust_5_desc: "Responsive Canadian customer support",
};

export const FALLBACK_ANNOUNCEMENTS = [
  { id: "a0", message: "Catalog restocking — browse products now, orders reopen soon", link: "/contact", linkText: "Get updates" },
  { id: "a1", message: "Canadian fulfillment — orders ship from within Canada", link: "/shipping", linkText: "Learn more" },
  { id: "a2", message: "Interac e-Transfer accepted at checkout", link: "/payment-instructions", linkText: "Details" },
  { id: "a3", message: "For research purposes only — see Terms of Service", link: "/terms", linkText: "Terms" },
];
