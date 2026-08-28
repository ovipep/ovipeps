import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Supabase Postgres connection is not configured");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminSeedPassword = process.env.SEED_ADMIN_PASSWORD;
  const demoSeedPassword = process.env.SEED_DEMO_PASSWORD;
  const adminPassword = await bcrypt.hash(
    adminSeedPassword ?? randomBytes(32).toString("base64url"),
    12
  );

  const admin = await prisma.user.upsert({
    where: { email: "ovipeps@gmail.com" },
    update: { role: "ADMIN" },
    create: {
      email: "ovipeps@gmail.com",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "OVIpeps",
      role: "ADMIN",
    },
  });

  if (demoSeedPassword) {
    const customerPassword = await bcrypt.hash(demoSeedPassword, 12);
    await prisma.user.upsert({
      where: { email: "demo@ovipeps.ca" },
      update: {},
      create: {
        email: "demo@ovipeps.ca",
        passwordHash: customerPassword,
        firstName: "Demo",
        lastName: "Researcher",
        role: "CUSTOMER",
      },
    });
  }

  const products = [
    {
      name: "Retatrutide GLP-3",
      slug: "glp-3",
      shortDescription: "Advanced metabolic research compound",
      researchCategory: "Metabolic Research",
      featured: true,
      isNew: true,
      imageUrl: "/images/products/glp-3.png",
      variants: [
        { name: "5mg", sku: "GLP3-5MG", price: 0, concentration: "5mg", size: "5mg", stockQuantity: 0 },
        { name: "10mg", sku: "GLP3-10MG", price: 80, concentration: "10mg", size: "10mg", stockQuantity: 4 },
      ],
    },
    {
      name: "KLOW",
      slug: "klow",
      shortDescription: "Recovery research blend",
      researchCategory: "Recovery Research",
      featured: true,
      imageUrl: "/images/products/klow.png",
      variants: [
        { name: "80mg", sku: "KLOW-80MG", price: 219.99, concentration: "80mg", size: "80mg", stockQuantity: 0 },
      ],
    },
    {
      name: "5-Amino-1MQ",
      slug: "5-amino-1mq",
      shortDescription: "Metabolic enzyme inhibition research",
      researchCategory: "Metabolic Research",
      featured: true,
      imageUrl: "/images/products/5-amino-1mq.png",
      variants: [
        { name: "5mg", sku: "5AMQ-5MG", price: 84.99, concentration: "5mg", size: "5mg", stockQuantity: 0 },
        { name: "50mg", sku: "5AMQ-50MG", price: 299.99, concentration: "50mg", size: "50mg", stockQuantity: 0 },
      ],
    },
    {
      name: "GLOW",
      slug: "glow",
      shortDescription: "Tissue research compound",
      researchCategory: "Tissue Research",
      featured: true,
      imageUrl: "/images/products/glow.png",
      variants: [
        { name: "10mg", sku: "GLOW-10MG", price: 129.99, concentration: "10mg", size: "10mg", stockQuantity: 0 },
      ],
    },
    {
      name: "KPV",
      slug: "kpv",
      shortDescription: "Peptide research compound",
      researchCategory: "Peptide Research",
      imageUrl: "/images/products/kpv.png",
      variants: [
        { name: "10mg", sku: "KPV-10MG", price: 69.99, concentration: "10mg", size: "10mg", stockQuantity: 0 },
      ],
    },
    {
      name: "CJC/Ipamorelin",
      slug: "cjc-ipamorelin",
      shortDescription: "CJC and Ipamorelin laboratory blend",
      researchCategory: "Peptide Blend",
      featured: true,
      isNew: true,
      imageUrl: "/images/products/cjc-ipamorelin.jpg",
      variants: [
        { name: "10mg", sku: "CJCIPA-10MG", price: 80, concentration: "10mg", size: "10mg", stockQuantity: 4 },
        { name: "40mg", sku: "CJCIPA-40MG", price: 189.99, concentration: "40mg", size: "40mg", stockQuantity: 0 },
      ],
    },
    {
      name: "GHK-Cu",
      slug: "ghk-cu",
      shortDescription: "Copper peptide research compound",
      researchCategory: "Peptide Research",
      featured: true,
      isNew: true,
      imageUrl: "/images/products/ghk-cu.jpg",
      variants: [
        { name: "50mg", sku: "GHKCU-50MG", price: 50, concentration: "50mg", size: "50mg", stockQuantity: 8 },
      ],
    },
    {
      name: "MOTS-C",
      slug: "mots-c",
      shortDescription: "Mitochondrial peptide research compound",
      researchCategory: "Metabolic Research",
      featured: true,
      isNew: true,
      imageUrl: "/images/products/mots-c.jpg",
      variants: [
        { name: "10mg", sku: "MOTSC-10MG", price: 45, concentration: "10mg", size: "10mg", stockQuantity: 10 },
      ],
    },
    {
      name: "Wolverine Stack (BPC-157 / TB-500)",
      slug: "bpc157-tb500",
      shortDescription: "Tissue repair research blend",
      researchCategory: "Recovery Research",
      featured: true,
      imageUrl: "/images/products/bpc157-tb500.png",
      variants: [
        { name: "10mg/10mg", sku: "WOLV-10-10", price: 179.99, concentration: "10mg/10mg", size: "10mg/10mg", stockQuantity: 0 },
      ],
    },
    {
      name: "BAC Water",
      slug: "bac-water",
      shortDescription: "Peptide reconstitution solution",
      researchCategory: "Supplies",
      category: "SUPPLY" as const,
      imageUrl: "/images/products/kpv.png",
      variants: [
        { name: "30ml", sku: "BAC-30ML", price: 19.99, size: "30ml", stockQuantity: 0 },
      ],
    },
  ];

  for (const p of products) {
    const { variants, category, ...productData } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...productData, published: true, category: category ?? "RESEARCH_PEPTIDE" },
      create: { ...productData, published: true, category: category ?? "RESEARCH_PEPTIDE" },
    });

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { ...v, productId: product.id, isDefault: i === 0, inStock: v.stockQuantity > 0 },
        create: { ...v, productId: product.id, isDefault: i === 0, inStock: v.stockQuantity > 0 },
      });
    }

    const batch = await prisma.productBatch.upsert({
      where: { productId_batchNumber: { productId: product.id, batchNumber: `B2026-${p.slug.toUpperCase().slice(0, 4)}` } },
      update: {},
      create: {
        productId: product.id,
        batchNumber: `B2026-${p.slug.toUpperCase().slice(0, 4)}`,
        lotNumber: `LOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        manufacturedAt: new Date("2026-01-15"),
      },
    });
  }

  const glp3 = await prisma.product.findUnique({ where: { slug: "glp-3" } });
  if (glp3) {
    await prisma.coaDocument.upsert({
      where: { id: "seed-coa-glp3" },
      update: {},
      create: {
        id: "seed-coa-glp3",
        productId: glp3.id,
        batchNumber: "B2026-GLP3",
        lotNumber: "LOT-GLP3A1",
        testingDate: new Date("2026-01-20"),
        testingProvider: "Independent Third-Party Laboratory",
        purityResult: "Available upon request",
        resultSummary: "Batch documentation available for qualified research orders.",
        published: true,
      },
    });
  }

  const announcements = [
    { message: "Canadian fulfillment — orders ship from within Canada", sortOrder: 0 },
    { message: "Interac e-Transfer accepted at checkout", sortOrder: 1 },
    { message: "For research purposes only — laboratory use", sortOrder: 2 },
  ];

  for (const a of announcements) {
    await prisma.announcement.create({ data: { ...a, active: true } });
  }

  const settings = [
    { key: "etransfer_email", value: "ovipeps@gmail.com" },
    { key: "etransfer_instructions", value: "Please send your Interac e-Transfer to ovipeps@gmail.com. Include your order number in the message field. Orders are processed once payment is confirmed." },
    { key: "shipping_threshold", value: "300" },
    { key: "free_shipping_message", value: "Free expedited shipping on orders over $300 CAD" },
    { key: "affiliate_default_commission", value: "10" },
    { key: "affiliate_attribution_days", value: "30" },
    { key: "commission_hold_days", value: "14" },
    { key: "site_name", value: "OVIpeps" },
    { key: "support_email", value: "ovipeps@gmail.com" },
    { key: "research_disclaimer", value: "All products are sold for research purposes only. Not intended for human or veterinary consumption." },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  const trustItems = [
    { key: "trust_1_title", value: "Canadian Fulfillment" },
    { key: "trust_1_desc", value: "Orders fulfilled from within Canada" },
    { key: "trust_2_title", value: "Clear Communication" },
    { key: "trust_2_desc", value: "Straightforward product and order information" },
    { key: "trust_3_title", value: "Secure Order Process" },
    { key: "trust_3_desc", value: "Protected checkout and order tracking" },
    { key: "trust_4_title", value: "Research Use Only" },
    { key: "trust_4_desc", value: "Clear product communication for laboratory use" },
    { key: "trust_5_title", value: "Fast Support" },
    { key: "trust_5_desc", value: "Responsive Canadian customer support" },
  ];

  for (const t of trustItems) {
    await prisma.siteSetting.upsert({
      where: { key: t.key },
      update: { value: t.value },
      create: t,
    });
  }

  const articles = [
    {
      title: "Peptides 101: A Researcher's Introduction",
      slug: "peptides-101-introduction",
      excerpt: "Understanding peptide research compounds, their applications in laboratory settings, and responsible handling practices.",
      category: "PEPTIDES_101" as const,
      author: "OVIpeps Research Team",
      content: `## What Are Research Peptides?

Research peptides are short chains of amino acids synthesized for laboratory and scientific research purposes. They are used in controlled research environments to study biological processes, cellular mechanisms, and molecular interactions.

## Research-Use-Only Classification

All peptide products sold through OVIpeps are intended exclusively for in-vitro research and laboratory use. They are not approved for human consumption, medical treatment, or diagnostic purposes.

## Quality Considerations for Researchers

When selecting research peptides for laboratory work, researchers typically evaluate:

- **Documentation availability** — batch records and analytical reports
- **Storage and handling requirements** — lyophilized vs. reconstituted stability
- **Supplier transparency** — clear product specifications and fulfillment information
- **Canadian fulfillment** — domestic shipping and support

## Responsible Research Practices

Researchers should maintain proper laboratory protocols including:

1. Appropriate storage conditions (typically refrigerated after reconstitution)
2. Sterile handling techniques
3. Accurate record-keeping of batch numbers and lot information
4. Compliance with institutional research guidelines

## Next Steps

Explore our [Research Hub](/research) for additional guides on COA interpretation, storage protocols, and Canadian research considerations.`,
      published: true,
      publishedAt: new Date(),
    },
    {
      title: "Understanding Certificates of Analysis (COAs)",
      slug: "understanding-coas",
      excerpt: "Learn how to read and interpret Certificates of Analysis for research peptide batches.",
      category: "COA_EDUCATION" as const,
      author: "OVIpeps Research Team",
      content: `## What Is a Certificate of Analysis?

A Certificate of Analysis (COA) is a document provided by an independent testing laboratory that reports analytical results for a specific product batch. For research compounds, COAs typically include identity confirmation, purity assessment, and other relevant analytical data.

## Key Fields on a COA

When reviewing a COA in our [Lab Results library](/lab-results), look for:

- **Product name** and batch/lot number
- **Testing date** and laboratory name
- **Analytical methods** used
- **Results summary** with measured values

## How OVIpeps Handles Documentation

We associate COA documents with specific product batches. When documentation is available for a batch, it appears in our COA library and on the corresponding product page.

## Important Notes

- COA availability varies by batch
- Results reflect the specific batch tested, not all batches
- Documentation supports research procurement decisions but does not constitute medical or therapeutic claims

Visit our [COA Library](/lab-results) to search available batch documentation.`,
      published: true,
      publishedAt: new Date(),
    },
    {
      title: "Storage & Handling of Research Peptides",
      slug: "storage-handling",
      excerpt: "Best practices for storing lyophilized and reconstituted research peptides in laboratory settings.",
      category: "STORAGE_HANDLING" as const,
      author: "OVIpeps Research Team",
      content: `## Lyophilized (Freeze-Dried) Storage

Most research peptides are supplied in lyophilized powder form. General laboratory storage guidelines:

- Store unopened vials at **2–8°C (refrigerated)** or **-20°C (frozen)** depending on compound stability
- Protect from light and moisture
- Keep in original packaging until use

## Reconstitution

When preparing peptides for research use:

1. Use appropriate sterile diluent (e.g., bacteriostatic water for research applications)
2. Follow aseptic technique
3. Allow powder to dissolve completely — avoid vigorous shaking
4. Label with reconstitution date and concentration

## Post-Reconstitution Storage

- Most reconstituted peptides should be refrigerated at 2–8°C
- Use within the stability window recommended for your specific compound
- Avoid repeated freeze-thaw cycles

## Use Our Calculator

Our [Peptide Calculator](/calculator) helps researchers calculate concentrations and volumes for laboratory preparation.`,
      published: true,
      publishedAt: new Date(),
    },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: article,
      create: { ...article, readingTime: Math.ceil(article.content.split(/\s+/).length / 200) },
    });
  }

  const faqs = [
    { question: "Are OVIpeps products for human use?", answer: "No. All products are sold strictly for research and laboratory use only. They are not intended for human consumption, medical treatment, or diagnostic purposes.", category: "RESEARCH" as const },
    { question: "How do I pay for my order?", answer: "We accept Interac e-Transfer for Canadian orders. After placing your order, you will receive payment instructions with your unique order number to include in the transfer message.", category: "PAYMENT" as const },
    { question: "How long does shipping take?", answer: "Orders are typically processed within 1–2 business days after payment confirmation. Shipping times vary by province and carrier selection.", category: "SHIPPING" as const },
    { question: "Can I access COA documents?", answer: "Yes. Available Certificates of Analysis are published in our Lab Results library. Search by product name, batch number, or lot number.", category: "COA" as const },
    { question: "How does the affiliate program work?", answer: "Approved partners receive a unique referral code that gives customers 5% off. Affiliates earn 10%, 20%, or 25% based on combined monthly qualifying sales before shipping and taxes. Commissions are calculated after payment confirmation and processed monthly.", category: "AFFILIATE" as const },
  ];

  for (let i = 0; i < faqs.length; i++) {
    await prisma.faqItem.create({ data: { ...faqs[i], sortOrder: i, published: true } });
  }

  console.log("Seed completed. Admin account:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
