import { productGuidePdf } from "@/lib/product-guide-pdf";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Attachment } from "resend";
import { db } from "@/lib/db";
import {
  PRODUCT_DOCUMENTS,
  PRODUCT_COA_DOCUMENTS,
} from "@/lib/product-documents";
import type { BulkPlanLine, BulkPlan } from "@/lib/bulk-checkout-schema";
import {
  isBpc157Product,
  isCjcIpamorelinProduct,
  isNadPlusProduct,
  isMotscProduct,
} from "@/lib/order-email-attachments";

export async function collectBulkDocuments(
  items: BulkPlanLine[],
  supplementalDocumentKeys: ("peptide_reference")[] = [],
): Promise<BulkPlan["documents"]> {
  const documents: BulkPlan["documents"] = [];
  const add = (
    label: string,
    url: string,
    filename = url.split("/").pop()!,
  ) => {
    if (!documents.some((d) => d.url === url))
      documents.push({ label, url, filename });
  };
  if (items.some((i) => i.category !== "SUPPLY"))
    add("Reconstitution resources", "/documents/reconstitution-resources.pdf");
  const aliases: Record<string, string> = {
    "glp-3": "retatrutide",
    "cjc-ipamorelin": "cjc-1295-ipamorelin",
    "bpc157-tb500": "wolverine-stack",
  };
  const classroom = await db.classroomDocument.findMany({
    where: {
      visible: true,
      slug: { in: items.map((i) => aliases[i.productSlug] ?? i.productSlug) },
    },
  });
  for (const item of items) {
    const guide = PRODUCT_DOCUMENTS[item.productSlug];
    if (guide)
      add(
        guide.label,
        `/api/product-documents/${item.productSlug}/guide.pdf`,
        `${item.productSlug}-guide.pdf`,
      );
    const stored = classroom.find(
      (d) => d.slug === (aliases[item.productSlug] ?? item.productSlug),
    );
    if (stored?.mimeType === "application/pdf")
      add(
        stored.displayName,
        `/api/classroom/${stored.slug}/file`,
        stored.fileName,
      );
    const coa = PRODUCT_COA_DOCUMENTS[item.productSlug];
    if (coa?.url.endsWith(".pdf")) add(coa.label, coa.url);
    if (item.productSlug === "glp-3") {
      add("Retatrutide 10 mg COA", "/coas/retatrutide-10mg-coa-2026-08-23.pdf");
      add("Retatrutide 15 mg COA", "/coas/retatrutide-15mg-coa-2026-10-16.pdf");
      add(
        "Retatrutide research handling guide",
        "/email-attachments/OVIpeps-Retatrutide-Research-Handling-Guide.pdf",
      );
    }
    if (
      isCjcIpamorelinProduct({
        slug: item.productSlug,
        name: item.productName,
      })
    )
      add(
        "CJC-1295 + Ipamorelin protocol",
        "/email-attachments/OVIpeps_CJC-1295_Ipamorelin_Protocol.pdf",
        "OVIpeps_CJC-1295_Ipamorelin_Protocol.pdf",
      );
    if (isMotscProduct({ slug: item.productSlug, name: item.productName }))
      add(
        "MOTS-c mitochondrial peptide document",
        "/email-attachments/OVIpeps_MOTS-c_Mitochondrial_Peptide.pdf",
        "OVIpeps_MOTS-c_Mitochondrial_Peptide.pdf",
      );
    if (isNadPlusProduct({ slug: item.productSlug, name: item.productName }))
      add(
        "NAD+ document",
        "/email-attachments/NAD+ (Nicotinamide Adenine Dinucleotide).pdf",
        "NAD+ (Nicotinamide Adenine Dinucleotide).pdf",
      );
    if (isBpc157Product({ slug: item.productSlug, name: item.productName }))
      add(
        "BPC-157 research guide",
        "/email-attachments/OVIpeps_BPC-157_Research_Guide.pdf",
        "OVIpeps_BPC-157_Research_Guide.pdf",
      );
  }
  const coas = await db.coaDocument.findMany({
    where: {
      published: true,
      productId: { in: items.map((i) => i.productId) },
      documentUrl: { not: null },
    },
    include: { product: { select: { name: true } } },
  });
  for (const coa of coas)
    if (coa.documentUrl)
      add(
        `${coa.product.name} COA - ${coa.batchNumber}`,
        coa.documentUrl,
        `${coa.product.name.replace(/[^a-z0-9-]/gi, "-")}-COA-${coa.id}.pdf`,
      );
  if (supplementalDocumentKeys.includes("peptide_reference")) add("Peptide Protocol Reference", "/email-attachments/peptide_reference.pdf", "peptide_reference.pdf");
  return documents;
}

async function readDocumentUrl(url: string): Promise<Buffer> {
  const site = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca",
  );
  const resolved = new URL(url, site);
  if (resolved.origin === site.origin) {
    const root = path.join(process.cwd(), "public");
    const filename = path.resolve(
      root,
      "." + decodeURIComponent(resolved.pathname),
    );
    if (!filename.startsWith(root + path.sep))
      throw new Error("Invalid attachment path");
    return readFile(filename);
  }
  const trustedStorage = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    resolved.protocol !== "https:" ||
    !trustedStorage ||
    resolved.origin !== new URL(trustedStorage).origin ||
    !resolved.pathname.startsWith("/storage/v1/object/public/")
  )
    throw new Error(
      "Attachment URL must use the site or its configured public storage",
    );
  const response = await fetch(resolved, {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Unable to load a required PDF attachment");
  if (Number(response.headers.get("content-length")) > 25_000_000)
    throw new Error("Attachment is too large");
  return Buffer.from(await response.arrayBuffer());
}

export async function loadBulkAttachments(
  documents: BulkPlan["documents"],
): Promise<Attachment[]> {
  let totalBytes = 0;
  const attachments: Attachment[] = [];
  for (const doc of documents) {
    let content: Buffer;
    const generatedGuide = doc.url.match(
      /^\/api\/product-documents\/([^/]+)\/guide\.pdf$/,
    );
    const classroom = doc.url.match(/^\/api\/classroom\/([^/]+)\/file$/);
    if (generatedGuide) content = await productGuidePdf(generatedGuide[1]);
    else if (classroom) {
      const stored = await db.classroomDocument.findUnique({
        where: { slug: classroom[1] },
      });
      if (!stored?.visible || stored.mimeType !== "application/pdf")
        throw new Error("A required classroom PDF is unavailable");
      content = stored.staticUrl
        ? await readDocumentUrl(stored.staticUrl)
        : Buffer.from(stored.fileData ?? []);
    } else if (doc.url.startsWith("/email-attachments/")) {
      const filename = path.basename(doc.url);
      content = await readFile(
        path.join(process.cwd(), "src/assets/email-attachments", filename),
      );
    } else content = await readDocumentUrl(doc.url);
    if (content.subarray(0, 5).toString() !== "%PDF-")
      throw new Error(`Required attachment is not a PDF: ${doc.filename}`);
    totalBytes += content.length;
    if (totalBytes > 25_000_000)
      throw new Error(
        "PDF attachments exceed the email size limit; review the documents before approval",
      );
    attachments.push({
      filename: doc.filename,
      content,
      contentType: "application/pdf",
    });
  }
  return attachments;
}
