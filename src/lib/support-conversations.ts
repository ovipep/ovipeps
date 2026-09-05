import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { sendEmail, type EmailTemplate } from "@/lib/emails";

const adminEmail = process.env.SUPPORT_REMINDER_EMAIL ?? "ovipeps@gmail.com";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function ensureSupportConversationSchema() {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SupportConversation" (
    "id" TEXT PRIMARY KEY, "reference" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
    "email" TEXT NOT NULL, "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT, "reminderEmailId" TEXT, "reminderSentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SupportConversation_status_createdAt_idx" ON "SupportConversation" ("status", "createdAt")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SupportConversation_email_idx" ON "SupportConversation" ("email")`);
  await db.$executeRawUnsafe(`ALTER TABLE "SupportConversation" ENABLE ROW LEVEL SECURITY`);
  await db.$executeRawUnsafe(`REVOKE ALL ON TABLE "SupportConversation" FROM anon, authenticated`);
}

export function createSupportReference() {
  return `CHAT-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function sendNewSupportAlert(input: { reference: string; name: string; email: string; message: string }) {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"}/admin/support`;
  const subject = `New customer message — ${input.reference}`;
  return sendEmail(adminEmail, {
    subject,
    html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65"><h2 style="color:#075985">New OVIpeps customer message</h2><p><strong>Reference:</strong> ${escapeHtml(input.reference)}</p><p><strong>Customer:</strong> ${escapeHtml(input.name)}</p><p><strong>Email:</strong> ${escapeHtml(input.email)}</p><p><strong>Message:</strong><br>${escapeHtml(input.message).replace(/\n/g, "<br>")}</p><p><a href="${adminUrl}" style="display:inline-block;border-radius:8px;background:#075985;padding:12px 18px;color:#fff;text-decoration:none;font-weight:700">Open Customer Messages</a></p><p style="font-size:12px;color:#64748b">If no response is recorded, a separate reminder will be sent after 20 hours.</p></div>`,
    text: `New OVIpeps customer message\n\nReference: ${input.reference}\nCustomer: ${input.name}\nEmail: ${input.email}\nMessage: ${input.message}\n\nOpen Customer Messages: ${adminUrl}\n\nIf no response is recorded, a separate reminder will be sent after 20 hours.`,
  }, { idempotencyKey: `support-alert-${input.reference}` });
}

export async function scheduleSupportReminder(input: { reference: string; name: string; email: string; message: string }) {
  const apiKey = process.env.RESEND_API_KEY ?? process.env.RESEND_ADMIN_API_KEY;
  if (!apiKey) return null;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "OVIpeps <orders@ovipeps.ca>";
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"}/admin/support`;
  const { data, error } = await new Resend(apiKey).emails.send({
    from, to: adminEmail, replyTo: input.email,
    subject: `20-hour response reminder — ${input.reference}`,
    html: `<h2>Unanswered OVIpeps chat</h2><p><strong>Reference:</strong> ${escapeHtml(input.reference)}</p><p><strong>Customer:</strong> ${escapeHtml(input.name)} (${escapeHtml(input.email)})</p><p><strong>Message:</strong><br>${escapeHtml(input.message).replace(/\n/g, "<br>")}</p><p><a href="${adminUrl}">Open the support inbox</a></p>`,
    text: `Unanswered OVIpeps chat\n\nReference: ${input.reference}\nCustomer: ${input.name} (${input.email})\nMessage: ${input.message}\n\n${adminUrl}`,
    scheduledAt: "in 20 hours",
  });
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function cancelSupportReminder(emailId: string | null) {
  const apiKey = process.env.RESEND_API_KEY ?? process.env.RESEND_ADMIN_API_KEY;
  if (!apiKey || !emailId) return;
  try { await new Resend(apiKey).emails.cancel(emailId); } catch (error) { console.error("Unable to cancel support reminder", error); }
}

export function supportReplyEmail(input: { name: string; reference: string; response: string }): EmailTemplate {
  const subject = `OVIpeps response — ${input.reference}`;
  const text = `Hello ${input.name},\n\n${input.response}\n\nChat reference: ${input.reference}\n\nOVIpeps`;
  return { subject, text, html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65"><h2 style="color:#075985">OVIpeps</h2><p>Hello ${escapeHtml(input.name)},</p><p>${escapeHtml(input.response).replace(/\n/g, "<br>")}</p><p style="color:#64748b">Chat reference: ${escapeHtml(input.reference)}</p></div>` };
}

export { sendEmail };
