CREATE TABLE "ClassroomDocument" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "staticUrl" TEXT,
  "fileData" BYTEA,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassroomDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassroomDocument_slug_key" ON "ClassroomDocument"("slug");
CREATE INDEX "ClassroomDocument_visible_sortOrder_idx" ON "ClassroomDocument"("visible", "sortOrder");

ALTER TABLE "ClassroomDocument" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ClassroomDocument" FROM anon, authenticated;

INSERT INTO "ClassroomDocument"
  ("id", "displayName", "slug", "fileName", "mimeType", "staticUrl", "visible", "sortOrder", "updatedAt")
VALUES
  ('classroom-retatrutide', 'Retatrutide', 'retatrutide', 'retatrutide-guide.png', 'image/png', '/documents/retatrutide-guide.png', true, 0, CURRENT_TIMESTAMP),
  ('classroom-bpc-157', 'BPC-157', 'bpc-157', 'bpc-157-guide.png', 'image/png', '/documents/bpc-157-guide.png', true, 1, CURRENT_TIMESTAMP),
  ('classroom-tb-500', 'TB-500', 'tb-500', 'tb-500-guide.png', 'image/png', '/documents/tb-500-guide.png', true, 2, CURRENT_TIMESTAMP),
  ('classroom-mots-c', 'MOTS-c', 'mots-c', 'mot-c-guide.png', 'image/png', '/documents/mot-c-guide.png', true, 3, CURRENT_TIMESTAMP),
  ('classroom-ss-31', 'SS-31', 'ss-31', 'ss-31-guide.png', 'image/png', '/documents/ss-31-guide.png', true, 4, CURRENT_TIMESTAMP),
  ('classroom-nad-plus', 'NAD+', 'nad-plus', 'nad-plus-guide.png', 'image/png', '/documents/nad-plus-guide.png', true, 5, CURRENT_TIMESTAMP),
  ('classroom-ghk-cu', 'GHK-Cu', 'ghk-cu', 'ghk-cu-guide.png', 'image/png', '/documents/ghk-cu-guide.png', true, 6, CURRENT_TIMESTAMP),
  ('classroom-kpv', 'KPV', 'kpv', 'kpv-guide.png', 'image/png', '/documents/kpv-guide.png', true, 7, CURRENT_TIMESTAMP),
  ('classroom-tesamorelin', 'Tesamorelin', 'tesamorelin', 'tesamorelin-guide.png', 'image/png', '/documents/tesamorelin-guide.png', true, 8, CURRENT_TIMESTAMP),
  ('classroom-selank', 'Selank', 'selank', 'selank-guide.png', 'image/png', '/documents/selank-guide.png', true, 9, CURRENT_TIMESTAMP),
  ('classroom-semax', 'Semax', 'semax', 'semax-guide.png', 'image/png', '/documents/semax-guide.png', true, 10, CURRENT_TIMESTAMP),
  ('classroom-epithalon', 'Epithalon', 'epithalon', 'epithalon-guide.png', 'image/png', '/documents/epithalon-guide.png', true, 11, CURRENT_TIMESTAMP),
  ('classroom-cjc-ipamorelin', 'CJC-1295 + Ipamorelin', 'cjc-1295-ipamorelin', 'cjc-1295-ipamorelin-guide.png', 'image/png', '/documents/cjc-1295-ipamorelin-guide.png', true, 12, CURRENT_TIMESTAMP),
  ('classroom-wolverine', 'Wolverine Stack', 'wolverine-stack', 'wolverine-stack-guide.png', 'image/png', '/documents/wolverine-stack-guide.png', true, 13, CURRENT_TIMESTAMP),
  ('classroom-klow', 'KLOW', 'klow', 'klow-guide.png', 'image/png', '/documents/klow-guide.png', true, 14, CURRENT_TIMESTAMP),
  ('classroom-glow', 'GLOW', 'glow', 'glow-guide.png', 'image/png', '/documents/glow-guide.png', true, 15, CURRENT_TIMESTAMP),
  ('classroom-5-amino-1q', '5 AMINO 1-Q', '5-amino-1q', '5-amino-1q-guide.png', 'image/png', '/documents/5-amino-1q-guide.png', true, 16, CURRENT_TIMESTAMP);
