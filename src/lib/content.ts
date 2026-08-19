import {
  type ArticleCategory,
  type FaqCategory,
  ArticleCategory as ArticleCategoryEnum,
  FaqCategory as FaqCategoryEnum,
} from "@/generated/prisma/enums";

export const SITE_NAME = "OVIpeps";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ovipeps.ca";

export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  PEPTIDES_101: "Peptides 101",
  RESEARCH_GUIDES: "Research Guides",
  LAB_TESTING: "Lab Testing",
  COA_EDUCATION: "COA Education",
  STORAGE_HANDLING: "Storage & Handling",
  INDUSTRY_EDUCATION: "Industry Education",
  CANADIAN_RESEARCH: "Canadian Research",
};

export const ARTICLE_CATEGORY_DESCRIPTIONS: Record<ArticleCategory, string> = {
  PEPTIDES_101: "Foundational concepts for peptide research in laboratory settings.",
  RESEARCH_GUIDES: "Practical guidance for procurement, preparation, and documentation.",
  LAB_TESTING: "Analytical testing concepts and laboratory quality considerations.",
  COA_EDUCATION: "How to read and interpret certificates of analysis.",
  STORAGE_HANDLING: "Protocols for lyophilized and reconstituted peptide storage.",
  INDUSTRY_EDUCATION: "Context on research supply chains and responsible sourcing.",
  CANADIAN_RESEARCH: "Domestic fulfillment, compliance context, and local support.",
};

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  GENERAL: "General",
  SHIPPING: "Shipping",
  PAYMENT: "Payment",
  PRODUCTS: "Products",
  COA: "Certificates of Analysis",
  AFFILIATE: "Affiliate Program",
  RESEARCH: "Research & Safety",
};

export const ARTICLE_CATEGORIES = Object.values(ArticleCategoryEnum);
export const FAQ_CATEGORIES = Object.values(FaqCategoryEnum);
