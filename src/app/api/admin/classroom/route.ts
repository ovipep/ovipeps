import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function validateFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error("Choose a PDF or image document");
  }
  if (!ALLOWED_TYPES.has(value.type)) {
    throw new Error("Only PDF, PNG, JPG, and WebP documents are supported");
  }
  if (value.size > MAX_FILE_SIZE) {
    throw new Error("Document must be 4 MB or smaller");
  }
  return value;
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const slug = slugify(displayName);
    const file = validateFile(formData.get("file"));
    if (!displayName || !slug) throw new Error("Peptide or compound name is required");

    const last = await db.classroomDocument.aggregate({ _max: { sortOrder: true } });
    const document = await db.classroomDocument.create({
      data: {
        displayName,
        slug,
        fileName: file.name,
        mimeType: file.type,
        fileData: new Uint8Array(await file.arrayBuffer()),
        staticUrl: null,
        visible: formData.get("visible") !== "false",
        sortOrder: (last._max.sortOrder ?? -1) + 1,
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
    return NextResponse.json(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add document";
    return NextResponse.json(
      { error: message.includes("Unique constraint") ? "That display name already exists" : message },
      { status: 400 }
    );
  }
}
