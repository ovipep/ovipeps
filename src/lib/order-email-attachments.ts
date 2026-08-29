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

let retatrutideGuideContent: Promise<Buffer> | undefined;

export function isRetatrutideProduct(product: {
  slug: string;
  name: string;
}) {
  return (
    product.slug.trim().toLowerCase() === RETATRUTIDE_PRODUCT_SLUG ||
    product.name.toLowerCase().includes("retatrutide")
  );
}

async function getRetatrutideGuideContent() {
  retatrutideGuideContent ??= readFile(RETATRUTIDE_GUIDE_PATH).catch((error) => {
    retatrutideGuideContent = undefined;
    throw error;
  });
  return retatrutideGuideContent;
}

export async function getOrderConfirmationAttachments(
  includesRetatrutide: boolean
): Promise<Attachment[] | undefined> {
  if (!includesRetatrutide) return undefined;

  return [
    {
      filename: RETATRUTIDE_GUIDE_FILENAME,
      content: await getRetatrutideGuideContent(),
      contentType: "application/pdf",
    },
  ];
}
