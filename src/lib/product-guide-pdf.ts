import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { PRODUCT_DOCUMENTS } from "@/lib/product-documents";
/** Wrap the original image losslessly; preserve the existing guide without rewriting it. */
export async function productGuidePdf(slug: string) {
  const guide = PRODUCT_DOCUMENTS[slug];
  if (!guide) throw new Error("Product guide not found");
  const imageBytes = await readFile(
    path.join(process.cwd(), "public", guide.url),
  );
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(imageBytes);
  const width = 612,
    height = (width * image.height) / image.width;
  pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  pdf.setTitle(guide.label);
  return Buffer.from(await pdf.save());
}
