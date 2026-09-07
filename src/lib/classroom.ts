import { db } from "./db";
import { safeDbQuery } from "./safe-db";

export interface ClassroomNavDocument {
  id: string;
  displayName: string;
  slug: string;
}

export const FALLBACK_CLASSROOM_DOCUMENTS: ClassroomNavDocument[] = [
  ["retatrutide", "Retatrutide"],
  ["bpc-157", "BPC-157"],
  ["tb-500", "TB-500"],
  ["mots-c", "MOTS-c"],
  ["ss-31", "SS-31"],
  ["nad-plus", "NAD+"],
  ["ghk-cu", "GHK-Cu"],
  ["kpv", "KPV"],
  ["tesamorelin", "Tesamorelin"],
  ["selank", "Selank"],
  ["semax", "Semax"],
  ["epithalon", "Epithalon"],
  ["cjc-1295-ipamorelin", "CJC-1295 + Ipamorelin"],
  ["wolverine-stack", "Wolverine Stack"],
  ["klow", "KLOW"],
  ["glow", "GLOW"],
  ["5-amino-1q", "5 AMINO 1-Q"],
].map(([slug, displayName]) => ({ id: slug, slug, displayName }));

export async function getVisibleClassroomDocuments() {
  return safeDbQuery(
    () =>
      db.classroomDocument.findMany({
        where: { visible: true },
        orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
        select: { id: true, displayName: true, slug: true },
      }),
    FALLBACK_CLASSROOM_DOCUMENTS
  );
}

export function fallbackDocumentUrl(slug: string) {
  const urls: Record<string, string> = {
    retatrutide: "/documents/retatrutide-guide.png",
    "bpc-157": "/documents/bpc-157-guide.png",
    "tb-500": "/documents/tb-500-guide.png",
    "mots-c": "/documents/mot-c-guide.png",
    "ss-31": "/documents/ss-31-guide.png",
    "nad-plus": "/documents/nad-plus-guide.png",
    "ghk-cu": "/documents/ghk-cu-guide.png",
    kpv: "/documents/kpv-guide.png",
    tesamorelin: "/documents/tesamorelin-guide.png",
    selank: "/documents/selank-guide.png",
    semax: "/documents/semax-guide.png",
    epithalon: "/documents/epithalon-guide.png",
    "cjc-1295-ipamorelin": "/documents/cjc-1295-ipamorelin-guide.png",
    "wolverine-stack": "/documents/wolverine-stack-guide.png",
    klow: "/documents/klow-guide.png",
    glow: "/documents/glow-guide.png",
    "5-amino-1q": "/documents/5-amino-1q-guide.png",
  };
  return urls[slug];
}
