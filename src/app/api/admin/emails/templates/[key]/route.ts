import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isEmailTemplateKey,
  saveEditableEmailTemplate,
} from "@/lib/emails";

const templateSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject is too long")
    .refine((value) => !/[\r\n]/.test(value), "Subject must be one line"),
  body: z.string().trim().min(1, "Message is required").max(20_000),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  if (!isEmailTemplateKey(key)) {
    return NextResponse.json({ error: "Unknown email template" }, { status: 404 });
  }

  const parsed = templateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid template" },
      { status: 400 }
    );
  }

  await saveEditableEmailTemplate(key, parsed.data.subject, parsed.data.body);
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EMAIL_TEMPLATE_UPDATED",
      entity: "EmailTemplate",
      entityId: key,
      details: JSON.stringify({ subject: parsed.data.subject }),
    },
  });

  return NextResponse.json({ success: true });
}
