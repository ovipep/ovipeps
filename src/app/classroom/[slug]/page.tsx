import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { ClassroomSelector } from "@/components/classroom/classroom-selector";
import styles from "./classroom-viewer.module.css";
import { db } from "@/lib/db";
import { safeDbQuery } from "@/lib/safe-db";
import {
  FALLBACK_CLASSROOM_DOCUMENTS,
  fallbackDocumentUrl,
  getVisibleClassroomDocuments,
} from "@/lib/classroom";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/classroom/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const fallback = FALLBACK_CLASSROOM_DOCUMENTS.find((item) => item.slug === slug);
  const document = await safeDbQuery(
    () => db.classroomDocument.findUnique({ where: { slug }, select: { displayName: true, visible: true } }),
    null
  );
  const name = document?.visible ? document.displayName : fallback?.displayName;
  return { title: name ? `${name} Classroom` : "Classroom" };
}

export default async function ClassroomDocumentPage({
  params,
}: PageProps<"/classroom/[slug]">) {
  const { slug } = await params;
  const [documents, storedDocument] = await Promise.all([
    getVisibleClassroomDocuments(),
    safeDbQuery(
      () => db.classroomDocument.findUnique({
        where: { slug },
        select: { id: true, displayName: true, slug: true, mimeType: true, staticUrl: true, visible: true },
      }),
      null
    ),
  ]);

  const fallback = FALLBACK_CLASSROOM_DOCUMENTS.find((item) => item.slug === slug);
  if (storedDocument && !storedDocument.visible) notFound();
  if (!storedDocument && !fallback) notFound();

  const document = storedDocument ?? {
    ...fallback!,
    mimeType: "image/png",
    staticUrl: fallbackDocumentUrl(slug),
    visible: true,
  };
  const fileUrl = storedDocument?.staticUrl
    ? storedDocument.staticUrl
    : storedDocument
      ? `/api/classroom/${storedDocument.slug}/file`
      : fallbackDocumentUrl(slug);
  const isPdf = document.mimeType === "application/pdf";

  return (
    <section className="bg-muted/30 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to website
          </Link>
          <ClassroomSelector documents={documents} currentSlug={slug} />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          {isPdf ? (
            <>
              <div className={styles.fullDocument}>
                <FileText className="h-10 w-10 text-sky" aria-hidden="true" />
                <p className="text-lg font-semibold text-navy-deep">{document.displayName}</p>
                <p className="text-sm text-muted-foreground">Open the PDF in a new tab to read every page.</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky px-5 py-3 text-sm font-semibold text-white"
                >
                  Open full document <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <div className={styles.embeddedDocument}>
                <iframe
                  src={`${fileUrl}#view=FitH`}
                  title={`${document.displayName} document`}
                  className="h-[78vh] min-h-[560px] w-full"
                />
              </div>
            </>
          ) : (
            <div className="p-2 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={`${document.displayName} information document`}
                className="mx-auto h-auto max-w-full"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
