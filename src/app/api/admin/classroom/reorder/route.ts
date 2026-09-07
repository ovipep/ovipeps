import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { ids?: string[] };
  if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Invalid document order" }, { status: 400 });
  }

  await db.$transaction(
    body.ids.map((id, sortOrder) =>
      db.classroomDocument.update({ where: { id }, data: { sortOrder } })
    )
  );
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
