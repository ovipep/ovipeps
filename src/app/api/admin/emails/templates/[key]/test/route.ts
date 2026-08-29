import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildEmailTemplate,
  getEmailTemplateSampleVariables,
  isEmailTemplateKey,
  sendEmail,
} from "@/lib/emails";

const testSchema = z.object({ email: z.string().trim().email() });

export async function POST(
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

  const parsed = testSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid test email" }, { status: 400 });
  }

  const template = await buildEmailTemplate(
    key,
    getEmailTemplateSampleVariables(key)
  );
  const result = await sendEmail(parsed.data.email.toLowerCase(), {
    ...template,
    subject: `[TEST] ${template.subject}`,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EMAIL_TEMPLATE_TEST_SENT",
      entity: "EmailTemplate",
      entityId: key,
      details: JSON.stringify({ recipient: parsed.data.email.toLowerCase(), emailId: result.id }),
    },
  });

  return NextResponse.json({ success: true, id: result.id });
}
