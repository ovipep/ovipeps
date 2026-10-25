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

let retatrutideGuideContent: Promise<Buffer> | undefined;
let cjcIpamorelinContent: Promise<Buffer> | undefined;
let motscContent: Promise<Buffer> | undefined;

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

export async function getOrderConfirmationAttachments(
  includesRetatrutide: boolean,
  includesCjcIpamorelin = false,
  includesMotsc = false,
): Promise<Attachment[] | undefined> {
  if (!includesRetatrutide && !includesCjcIpamorelin && !includesMotsc)
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
