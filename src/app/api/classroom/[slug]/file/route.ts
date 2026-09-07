import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const document = await db.classroomDocument.findFirst({
    where: { slug, visible: true },
    select: { fileData: true, fileName: true, mimeType: true, staticUrl: true },
  });

  if (!document) return new Response("Document not found", { status: 404 });
  if (document.staticUrl) {
    return Response.redirect(
      new URL(document.staticUrl, process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"),
      307
    );
  }
  if (!document.fileData) return new Response("Document not found", { status: 404 });

  return new Response(document.fileData, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${document.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
      "Cache-Control": "public, max-age=300, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
