import { db } from "@/lib/db";
import type { CoaDocumentSummary } from "@/types/coa";

const publishedFileCoas: CoaDocumentSummary[] = [
  {
    id: "file-ret-604",
    batchNumber: "RET-604",
    lotNumber: null,
    testingDate: "2026-09-21",
    testingProvider: "SideChain Analytics",
    purityResult: null,
    resultSummary: "Certificate of Analysis, report COA-2026-SC-02632. See the PDF for the reported results and sample details.",
    documentUrl: "/coas/GA-002-RT.pdf",
    productName: "Retatrutide GLP-3",
    productSlug: "glp-3",
  },
  {
    id: "file-nad-093",
    batchNumber: "NAD-093",
    lotNumber: null,
    testingDate: "2026-09-21",
    testingProvider: "SideChain Analytics",
    purityResult: null,
    resultSummary: "Certificate of Analysis, report COA-2026-SC-02628. See the PDF for the reported results and sample details.",
    documentUrl: "/coas/GA-002-NAD.pdf",
    productName: "NAD+",
    productSlug: "nad-plus",
  },
  {
    id: "file-kpv-063",
    batchNumber: "KPV-063",
    lotNumber: null,
    testingDate: "2026-09-21",
    testingProvider: "SideChain Analytics",
    purityResult: null,
    resultSummary: "Certificate of Analysis, report COA-2026-SC-02630. See the PDF for the reported results and sample details.",
    documentUrl: "/coas/GA-002-KPV.pdf",
    productName: "KPV",
    productSlug: "kpv",
  },
  {
    id: "file-ghk-115",
    batchNumber: "GHK-115",
    lotNumber: null,
    testingDate: "2026-09-21",
    testingProvider: "SideChain Analytics",
    purityResult: null,
    resultSummary: "Certificate of Analysis, report COA-2026-SC-02629. See the PDF for the reported results and sample details.",
    documentUrl: "/coas/GA-002-GHK.pdf",
    productName: "GHK-Cu",
    productSlug: "ghk-cu",
  },
];

function includeFileCoas(documents: CoaDocumentSummary[]) {
  return [...documents, ...publishedFileCoas.filter((file) => !documents.some(
    (document) => document.productSlug === file.productSlug && document.batchNumber === file.batchNumber
  ))];
}

type CoaWithProduct = {
  id: string;
  batchNumber: string;
  lotNumber: string | null;
  testingDate: Date | null;
  testingProvider: string | null;
  purityResult: string | null;
  resultSummary: string | null;
  documentUrl: string | null;
  product: { name: string; slug: string };
};

function mapCoaDocument(doc: CoaWithProduct): CoaDocumentSummary {
  return {
    id: doc.id,
    batchNumber: doc.batchNumber,
    lotNumber: doc.lotNumber,
    testingDate: doc.testingDate?.toISOString() ?? null,
    testingProvider: doc.testingProvider,
    purityResult: doc.purityResult,
    resultSummary: doc.resultSummary,
    documentUrl: doc.documentUrl,
    productName: doc.product.name,
    productSlug: doc.product.slug,
  };
}

export async function getPublishedCoaDocuments(): Promise<CoaDocumentSummary[]> {
  try {
    const documents = await db.coaDocument.findMany({
      where: { published: true },
      include: { product: { select: { name: true, slug: true } } },
      orderBy: [{ testingDate: "desc" }, { createdAt: "desc" }],
    });

    return includeFileCoas(documents.map(mapCoaDocument));
  } catch {
    return publishedFileCoas;
  }
}

export async function searchPublishedCoaDocuments(
  query: string
): Promise<CoaDocumentSummary[]> {
  const trimmed = query.trim();
  if (!trimmed) return getPublishedCoaDocuments();

  try {
    const documents = await db.coaDocument.findMany({
      where: {
        published: true,
        OR: [
          { batchNumber: { contains: trimmed } },
          { lotNumber: { contains: trimmed } },
          { product: { name: { contains: trimmed } } },
          { testingProvider: { contains: trimmed } },
        ],
      },
      include: { product: { select: { name: true, slug: true } } },
      orderBy: [{ testingDate: "desc" }, { createdAt: "desc" }],
    });

    return includeFileCoas(documents.map(mapCoaDocument)).filter((doc) =>
      [doc.batchNumber, doc.lotNumber, doc.productName, doc.testingProvider]
        .some((field) => field?.toLowerCase().includes(trimmed.toLowerCase()))
    );
  } catch {
    return publishedFileCoas.filter((doc) =>
      [doc.batchNumber, doc.productName, doc.testingProvider]
        .some((field) => field?.toLowerCase().includes(trimmed.toLowerCase()))
    );
  }
}
