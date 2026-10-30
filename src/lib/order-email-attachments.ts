import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Attachment } from "resend";

const RETATRUTIDE_PRODUCT_SLUG = "glp-3";
const RETATRUTIDE_GUIDE_FILENAME =
  "OVIpeps-Retatrutide-Research-Handling-Guide.pdf";
const RETATRUTIDE_GUIDE_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "email-attachments",
  RETATRUTIDE_GUIDE_FILENAME
);
const CJC_IPAMORELIN_FILENAME = "OVIpeps_CJC-1295_Ipamorelin_Protocol.pdf";
const CJC_IPAMORELIN_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "email-attachments",
  CJC_IPAMORELIN_FILENAME,
);
const MOTSC_FILENAME = "OVIpeps_MOTS-c_Mitochondrial_Peptide.pdf";
const MOTSC_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "email-attachments",
  MOTSC_FILENAME,
);
const NAD_PLUS_FILENAME = "NAD+ (Nicotinamide Adenine Dinucleotide).pdf";
const NAD_PLUS_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "email-attachments",
  NAD_PLUS_FILENAME,
);
const BPC157_FILENAME = "OVIpeps_BPC-157_Research_Guide.pdf";
const BPC157_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "email-attachments",
  BPC157_FILENAME,
);
const GHKCU_FILENAME = "GHK-Cu (Copper Peptide Complex) Peptide.pdf";
const GHKCU_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "email-attachments",
  GHKCU_FILENAME,
);

let retatrutideGuideContent: Promise<Buffer> | undefined;
let cjcIpamorelinContent: Promise<Buffer> | undefined;
let motscContent: Promise<Buffer> | undefined;
let nadPlusContent: Promise<Buffer> | undefined;
let bpc157Content: Promise<Buffer> | undefined;
let ghkCuContent: Promise<Buffer> | undefined;

export function isCjcIpamorelinOrderItem(item: {
  productName: string;
  sku: string;
}) {
  return isCjcIpamorelinProduct({ name: item.productName, slug: "" }) ||
    /^CJC\s*[-/]?\s*IPA(?:-|$)/i.test(item.sku.trim());
}

export function isCjcIpamorelinProduct(product: {
  slug: string;
  name: string;
}) {
  const identifier = `${product.slug} ${product.name}`.toLowerCase();
  return (
    identifier.includes("cjc") &&
    (identifier.includes("ipamorelin") || /\bcjc\s*[-/]?\s*ipa\b/i.test(identifier))
  );
}

export function isMotscOrderItem(item: { productName: string; sku: string }) {
  return (
    isMotscProduct({ name: item.productName, slug: "" }) ||
    /^MOTS?C(?:-|$)/i.test(item.sku.trim())
  );
}

export function isMotscProduct(product: { slug: string; name: string }) {
  return /\bmots?[-\s]?c\b/i.test(`${product.slug} ${product.name}`);
}

export function isNadPlusOrderItem(item: { productName: string; sku: string }) {
  return (
    isNadPlusProduct({ name: item.productName, slug: "" }) ||
    /^NAD(?:\+|PLUS|[-_]|$)/i.test(item.sku.trim())
  );
}

export function isNadPlusProduct(product: { slug: string; name: string }) {
  return (
    product.slug.trim().toLowerCase() === "nad-plus" ||
    /^nad(?:\s*\+|\s+plus)?(?:\s|$)/i.test(product.name.trim())
  );
}

export function isBpc157OrderItem(item: { productName: string; sku: string }) {
  return (
    isBpc157Product({ name: item.productName, slug: "" }) ||
    /^BPC[-_]?157(?:-|$)/i.test(item.sku.trim())
  );
}

export function isBpc157Product(product: { slug: string; name: string }) {
  return /\bbpc[-\s]?157\b/i.test(`${product.slug} ${product.name}`);
}

export function isGhkcOrderItem(item: { productName: string; sku: string }) {
  return (
    isGhkcProduct({ slug: "", name: item.productName }) ||
    /^GHK[-_]?CU(?=$|[-_0-9])/i.test(item.sku.trim())
  );
}

export function isGhkcProduct(product: { slug: string; name: string }) {
  return (
    product.slug.trim().toLowerCase() === "ghk-cu" ||
    /^ghk[-\s]?cu(?:\s+\(copper peptide complex\)|\s+\d+(?:\.\d+)?\s*mg|\s*$)/i.test(
      product.name.trim(),
    )
  );
}

export function isRetatrutideProduct(product: {
  slug: string;
  name: string;
}) {
  return (
    product.slug.trim().toLowerCase() === RETATRUTIDE_PRODUCT_SLUG ||
    product.name.toLowerCase().includes("retatrutide")
  );
}

export function isRetatrutideOrderItem(item: {
  productName: string;
  sku: string;
}) {
  return (
    item.productName.toLowerCase().includes("retatrutide") ||
    /^GLP3(?:-|$)/i.test(item.sku.trim())
  );
}

async function getRetatrutideGuideContent() {
  retatrutideGuideContent ??= readFile(RETATRUTIDE_GUIDE_PATH).catch((error) => {
    retatrutideGuideContent = undefined;
    throw error;
  });
  return retatrutideGuideContent;
}

async function getCjcIpamorelinContent() {
  cjcIpamorelinContent ??= readFile(CJC_IPAMORELIN_PATH).catch((error) => {
    cjcIpamorelinContent = undefined;
    throw error;
  });
  return cjcIpamorelinContent;
}

async function getMotscContent() {
  motscContent ??= readFile(MOTSC_PATH).catch((error) => {
    motscContent = undefined;
    throw error;
  });
  return motscContent;
}

async function getNadPlusContent() {
  nadPlusContent ??= readFile(NAD_PLUS_PATH).catch((error) => {
    nadPlusContent = undefined;
    throw error;
  });
  return nadPlusContent;
}

async function getBpc157Content() {
  bpc157Content ??= readFile(BPC157_PATH).catch((error) => {
    bpc157Content = undefined;
    throw error;
  });
  return bpc157Content;
}

async function getGhkcContent() {
  ghkCuContent ??= readFile(GHKCU_PATH).catch((error) => {
    ghkCuContent = undefined;
    throw error;
  });
  return ghkCuContent;
}

export async function getOrderConfirmationAttachments(
  includesRetatrutide: boolean,
  includesCjcIpamorelin = false,
  includesMotsc = false,
  includesNadPlus = false,
  includesBpc157 = false,
  includesGhkc = false,
): Promise<Attachment[] | undefined> {
  if (
    !includesRetatrutide &&
    !includesCjcIpamorelin &&
    !includesMotsc &&
    !includesNadPlus &&
    !includesBpc157 &&
    !includesGhkc
  )
    return undefined;

  const attachments: Attachment[] = [];
  if (includesRetatrutide) {
    attachments.push({
      filename: RETATRUTIDE_GUIDE_FILENAME,
      content: await getRetatrutideGuideContent(),
      contentType: "application/pdf",
    });
  }
  if (includesCjcIpamorelin) {
    attachments.push({
      filename: CJC_IPAMORELIN_FILENAME,
      content: await getCjcIpamorelinContent(),
      contentType: "application/pdf",
    });
  }
  if (includesMotsc) {
    attachments.push({
      filename: MOTSC_FILENAME,
      content: await getMotscContent(),
      contentType: "application/pdf",
    });
  }
  if (includesNadPlus) {
    attachments.push({
      filename: NAD_PLUS_FILENAME,
      content: await getNadPlusContent(),
      contentType: "application/pdf",
    });
  }
  if (includesBpc157) {
    attachments.push({
      filename: BPC157_FILENAME,
      content: await getBpc157Content(),
      contentType: "application/pdf",
    });
  }
  if (includesGhkc) {
    attachments.push({
      filename: GHKCU_FILENAME,
      content: await getGhkcContent(),
      contentType: "application/pdf",
    });
  }
  return attachments;
}

export async function getCjcIpamorelinAttachment(): Promise<Attachment> {
  return {
    filename: CJC_IPAMORELIN_FILENAME,
    content: await getCjcIpamorelinContent(),
    contentType: "application/pdf",
  };
}

export async function getMotscAttachment(): Promise<Attachment> {
  return {
    filename: MOTSC_FILENAME,
    content: await getMotscContent(),
    contentType: "application/pdf",
  };
}

export async function getNadPlusAttachment(): Promise<Attachment> {
  return {
    filename: NAD_PLUS_FILENAME,
    content: await getNadPlusContent(),
    contentType: "application/pdf",
  };
}

export async function getBpc157Attachment(): Promise<Attachment> {
  return {
    filename: BPC157_FILENAME,
    content: await getBpc157Content(),
    contentType: "application/pdf",
  };
}

export async function getGhkcAttachment(): Promise<Attachment> {
  return {
    filename: GHKCU_FILENAME,
    content: await getGhkcContent(),
    contentType: "application/pdf",
  };
}
