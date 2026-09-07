import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const formData = await request.formData();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const visibleValue = formData.get("visible");
    const fileValue = formData.get("file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (file && !ALLOWED_TYPES.has(file.type)) {
      throw new Error("Only PDF, PNG, JPG, and WebP documents are supported");
    }
    if (file && file.size > MAX_FILE_SIZE) throw new Error("Document must be 4 MB or smaller");
    if (formData.has("displayName") && !displayName) throw new Error("Display name cannot be empty");

    const document = await db.classroomDocument.update({
      where: { id },
      data: {
        ...(displayName ? { displayName } : {}),
        ...(visibleValue !== null ? { visible: visibleValue === "true" } : {}),
        ...(file
          ? {
              fileName: file.name,
              mimeType: file.type,
              fileData: new Uint8Array(await file.arrayBuffer()),
              staticUrl: null,
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        slug: true,
        fileName: true,
        mimeType: true,
        visible: true,
        sortOrder: true,
      },
    });
    revalidatePath("/", "layout");
    revalidatePath(`/classroom/${document.slug}`);
    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update document" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.classroomDocument.delete({ where: { id } });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
