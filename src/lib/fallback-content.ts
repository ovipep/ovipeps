import type {
  ArticleCategory,
  FaqCategory,
} from "@/generated/prisma/enums";

export interface ContentArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: ArticleCategory;
  author: string;
  readingTime: number;
  publishedAt: Date;
  updatedAt: Date;
  metaTitle: string | null;
  metaDescription: string | null;
}

const publishedAt = new Date("2026-08-01T12:00:00.000Z");

export const FALLBACK_ARTICLES: ContentArticle[] = [
  {
    id: "article-peptides-101",
    title: "Peptides 101: A Researcher's Introduction",
    slug: "peptides-101-introduction",
    excerpt:
      "Understand research peptides, their laboratory classification, and the documentation practices that support responsible procurement.",
    category: "PEPTIDES_101",
    author: "OVIpeps Research Team",
    readingTime: 5,
    publishedAt,
    updatedAt: publishedAt,
    metaTitle: "Peptides 101: A Researcher's Introduction",
    metaDescription:
      "A practical introduction to research peptides, documentation, storage, and responsible laboratory handling.",
    content: `## What Are Research Peptides?

Research peptides are short chains of amino acids synthesized for controlled laboratory and scientific research. Researchers use them to study molecular interactions, cellular processes, and analytical methods in qualified settings.

## Research-Use-Only Classification

Products sold through OVIpeps are intended exclusively for in-vitro research and laboratory use. They are not approved for human consumption, medical treatment, diagnosis, or veterinary use.

## What to Review Before Ordering

A responsible procurement review should include:

- **Product identity** — verify the compound, variant, and listed specifications
- **Batch documentation** — confirm whether a published COA is associated with the relevant batch
- **Storage requirements** — identify temperature, light, and moisture controls before delivery
- **Laboratory procedures** — prepare appropriate handling, labeling, and record-keeping protocols

## Documentation Is Batch-Specific

Analytical documentation applies to the batch identified on the report. A result from one batch should not be assumed to represent another. OVIpeps identifies published documentation in the [COA Library](/lab-results) so researchers can inspect what is actually available.

## Responsible Laboratory Practice

Maintain institutional procedures for access control, sterile handling, labeling, inventory records, and disposal. Record the product name, batch or lot identifier, preparation date, storage condition, and researcher responsible for each sample.

## Continue Learning

Read [Understanding Certificates of Analysis](/research/understanding-coas) and [Storage & Handling of Research Peptides](/research/storage-handling) for the next steps in your procurement workflow.`,
  },
  {
    id: "article-understanding-coas",
    title: "Understanding Certificates of Analysis (COAs)",
    slug: "understanding-coas",
    excerpt:
      "Learn how to read batch identifiers, methods, dates, and reported results on research-product Certificates of Analysis.",
    category: "COA_EDUCATION",
    author: "OVIpeps Research Team",
    readingTime: 6,
    publishedAt,
    updatedAt: publishedAt,
    metaTitle: "How to Read a Research Peptide COA",
    metaDescription:
      "Learn what a Certificate of Analysis reports and how to evaluate batch-specific research documentation.",
    content: `## What Is a Certificate of Analysis?

A Certificate of Analysis (COA) is a report associated with a specific tested batch. It can document identity, analytical method, testing date, provider, and measured results.

## Start With the Identifiers

Before reviewing any result, match the document to the physical product:

1. Compare the product name
2. Match the batch or lot number
3. Confirm the document date
4. Check the named testing provider

A polished report is not useful when its identifiers do not match the material being evaluated.

## Review the Analytical Method

Different methods answer different questions. High-performance liquid chromatography may report a purity-related measurement, while mass spectrometry may support identity assessment. Read the method and result together rather than treating a single percentage as a complete quality statement.

## Understand the Scope

- Results apply to the identified sample and batch
- COA availability may vary between products and batches
- A published report supports procurement review but does not establish clinical suitability
- Research documentation must not be interpreted as medical guidance

## How OVIpeps Presents COAs

When documentation is published, OVIpeps associates it with the relevant product and lists available batch details in the [COA Library](/lab-results). If no report is listed, the site does not imply that one exists.

## A Practical Review Checklist

Confirm the product, batch, testing provider, date, methods, reported values, and document integrity. Save the report with your internal receiving records and note any discrepancy before beginning laboratory work.`,
  },
  {
    id: "article-storage-handling",
    title: "Storage & Handling of Research Peptides",
    slug: "storage-handling",
    excerpt:
      "A practical laboratory guide to receiving, labeling, storing, and preparing lyophilized research peptides.",
    category: "STORAGE_HANDLING",
    author: "OVIpeps Research Team",
    readingTime: 6,
    publishedAt,
    updatedAt: publishedAt,
    metaTitle: "Research Peptide Storage & Handling Guide",
    metaDescription:
      "General laboratory guidance for receiving, storing, documenting, and preparing research peptides.",
    content: `## Plan Storage Before Delivery

Review compound-specific documentation before an order arrives. Prepare controlled storage, inventory records, labels, and any required handling equipment in advance.

## Receiving a Shipment

On receipt:

1. Inspect the external package for damage
2. Confirm each product and quantity against the order
3. Record the batch or lot identifier
4. Photograph and report any discrepancy before opening affected material
5. Move products to the appropriate controlled environment promptly

## Lyophilized Material

General laboratory practices often include cool, dry, light-protected storage. Exact requirements vary by compound, so product-specific documentation and institutional protocols take precedence over generalized guidance.

## Reconstitution Workflow

Use an appropriate laboratory diluent and aseptic technique. Introduce liquid carefully, avoid vigorous agitation, and label the prepared sample with concentration, preparation date, operator, and storage condition.

The [Peptide Calculator](/calculator) can assist with concentration and volume arithmetic. It does not replace validated laboratory procedures.

## After Preparation

- Use clean, clearly labeled storage containers
- Minimize unnecessary temperature cycling
- Track access and sample withdrawals
- Follow the stability window established by your laboratory
- Dispose of expired material according to institutional procedures

## Record-Keeping

Connect each prepared sample to its original product, batch, COA when available, preparation record, and researcher. Complete records make later review and replication significantly easier.

## Important Limitation

This guide provides general educational context for qualified laboratory settings. Always follow compound-specific documentation and your institution's approved procedures.`,
  },
];

export interface FallbackFaq {
  question: string;
  answer: string;
  category: FaqCategory;
}

export const FALLBACK_FAQS: FallbackFaq[] = [
  {
    question: "Are OVIpeps products intended for human use?",
    answer:
      "No. Products are sold strictly for laboratory research use and are not intended for human consumption, treatment, diagnosis, or veterinary use.",
    category: "RESEARCH",
  },
  {
    question: "How do I pay for an order?",
    answer:
      "Canadian orders use Interac e-Transfer. After an order is received, the confirmation page displays the transfer address, amount, and unique order number. Processing begins after payment is matched and confirmed.",
    category: "PAYMENT",
  },
  {
    question: "When is an order shipped?",
    answer:
      "Orders are generally prepared after payment confirmation. Delivery timing depends on destination, carrier operations, and the shipping service shown for the order.",
    category: "SHIPPING",
  },
  {
    question: "Where can I find Certificates of Analysis?",
    answer:
      "Published batch documentation appears in the COA Library and on applicable product pages. Availability is batch-specific and is not implied when no document is listed.",
    category: "COA",
  },
  {
    question: "How should research peptides be stored?",
    answer:
      "Storage requirements vary by compound and preparation state. Review product-specific documentation and follow your institution's approved temperature, light, moisture, labeling, and access-control procedures.",
    category: "PRODUCTS",
  },
  {
    question: "Where does OVIpeps fulfill orders?",
    answer:
      "Orders are fulfilled from within Canada. Shipping details and available updates are shown during the ordering process.",
    category: "GENERAL",
  },
  {
    question: "How does the partner program work?",
    answer:
      "Approved partners receive a referral code and may earn commission on qualifying paid orders. Applications, attribution terms, approval rules, and payout conditions are explained on the Partner Program pages.",
    category: "AFFILIATE",
  },
];
