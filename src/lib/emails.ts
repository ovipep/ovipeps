import { Resend, type Attachment } from "resend";
import { db } from "@/lib/db";

const brandColor = "#075985";
const accentColor = "#06b6d4";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function wrap(content: string, preheader: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OVIpeps</title></head><body style="margin:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;color:#0f172a;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.08);"><tr><td style="padding:24px 30px;background:linear-gradient(135deg,${brandColor},${accentColor});color:#fff;font-size:25px;font-weight:800;">OVIpeps</td></tr><tr><td style="padding:30px;">${content}</td></tr><tr><td style="padding:22px 30px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;border-top:1px solid #e2e8f0;">OVIpeps products are intended exclusively for in-vitro research and laboratory use. Not intended for human or veterinary consumption.<br><a href="${siteUrl}/terms" style="color:${brandColor};">Terms</a> · <a href="${siteUrl}/privacy" style="color:${brandColor};">Privacy</a> · <a href="${siteUrl}/research-disclaimer" style="color:${brandColor};">Disclaimer</a><br>&copy; ${new Date().getFullYear()} OVIpeps</td></tr></table></td></tr></table></body></html>`;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export const EMAIL_TEMPLATE_KEYS = [
  "order_confirmation",
  "affiliate_approved",
  "password_reset",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export interface EditableEmailTemplate {
  key: EmailTemplateKey;
  label: string;
  description: string;
  subject: string;
  body: string;
  defaultSubject: string;
  defaultBody: string;
  variables: string[];
}

type EmailTemplateDefinition = Omit<
  EditableEmailTemplate,
  "key" | "subject" | "body" | "defaultSubject" | "defaultBody"
> & {
  subject: string;
  body: string;
};

const EMAIL_TEMPLATE_DEFAULTS: Record<EmailTemplateKey, EmailTemplateDefinition> = {
  order_confirmation: {
    label: "Order confirmation",
    description: "Sent immediately after a customer submits an order.",
    subject: "Order submitted — {{orderNumber}}",
    body: `Thank you, {{name}}!

Your order {{orderNumber}} was submitted successfully. No card, banking, or payment information was collected or processed on the OVIpeps website.

Items:
{{items}}

Order total: {{total}}

EXTERNAL PAYMENT (COMPLETED SEPARATELY)
Send {{total}} by Interac e-Transfer to {{etransferEmail}}.
Enter ONLY {{orderNumber}} in the message or memo field.
Confirm AutoDeposit displays {{autodepositName}}.

STORAGE AND HANDLING
Keep products at a consistent temperature; refrigeration is highly recommended. Keep each vial sealed in its original packaging, protect it from light and moisture, and retain the batch label for your records. Follow your qualified laboratory's protocol and the product's batch documentation.

Never send payment to an address other than the one in this official confirmation. If anything looks suspicious, reply to this email before sending funds.`,
    variables: [
      "name",
      "orderNumber",
      "items",
      "total",
      "etransferEmail",
      "autodepositName",
    ],
  },
  affiliate_approved: {
    label: "Affiliate approval",
    description: "Sent when an affiliate application is approved.",
    subject: "Welcome to the OVIpeps Partner Program",
    body: `Welcome, {{name}}!

Congratulations—your OVIpeps Partner Program application has been approved.

Monthly commission tiers are 10% up to $1,499, 20% from $1,500–$4,999, and 25% at $5,000 or more in combined qualifying sales before shipping and taxes. Customers using your active code receive 5% off.

Sign in at {{affiliateUrl}} to choose your unique affiliate code. Your referral link becomes active immediately after the code is saved.

Generate at least $300 CAD in qualifying sales each calendar month. After three missed months—not necessarily consecutive—your affiliate account is frozen pending OVIpeps review.`,
    variables: ["name", "affiliateUrl"],
  },
  password_reset: {
    label: "Password reset",
    description: "Sent after a customer requests a password reset.",
    subject: "Reset your OVIpeps password",
    body: `Hi {{name}},

Use the secure link below to choose a new password. It expires in one hour.

{{resetUrl}}

If you did not request this, you can ignore this email.`,
    variables: ["name", "resetUrl"],
  },
};

function settingKey(key: EmailTemplateKey, field: "subject" | "body") {
  return `email_template_${key}_${field}`;
}

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return EMAIL_TEMPLATE_KEYS.includes(value as EmailTemplateKey);
}

export async function getEditableEmailTemplates(): Promise<EditableEmailTemplate[]> {
  const keys = EMAIL_TEMPLATE_KEYS.flatMap((key) => [
    settingKey(key, "subject"),
    settingKey(key, "body"),
  ]);
  const stored = await db.siteSetting.findMany({ where: { key: { in: keys } } });
  const values = new Map(stored.map((entry) => [entry.key, entry.value]));

  return EMAIL_TEMPLATE_KEYS.map((key) => {
    const defaults = EMAIL_TEMPLATE_DEFAULTS[key];
    return {
      key,
      label: defaults.label,
      description: defaults.description,
      subject: values.get(settingKey(key, "subject")) ?? defaults.subject,
      body: values.get(settingKey(key, "body")) ?? defaults.body,
      defaultSubject: defaults.subject,
      defaultBody: defaults.body,
      variables: defaults.variables,
    };
  });
}

export async function saveEditableEmailTemplate(
  key: EmailTemplateKey,
  subject: string,
  body: string
) {
  await db.$transaction([
    db.siteSetting.upsert({
      where: { key: settingKey(key, "subject") },
      update: { value: subject },
      create: { key: settingKey(key, "subject"), value: subject },
    }),
    db.siteSetting.upsert({
      where: { key: settingKey(key, "body") },
      update: { value: body },
      create: { key: settingKey(key, "body"), value: body },
    }),
  ]);
}

function renderTokens(value: string, variables: Record<string, string>) {
  return value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (token, variable: string) =>
    Object.hasOwn(variables, variable) ? variables[variable] : token
  );
}

function textToHtml(value: string) {
  const escaped = escapeHtml(value);
  const linked = escaped.replace(
    /(https:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${brandColor};font-weight:700;">$1</a>`
  );
  return linked
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 18px;font-size:15px;line-height:1.7;white-space:pre-line;">${paragraph}</p>`)
    .join("");
}

export async function buildEmailTemplate(
  key: EmailTemplateKey,
  variables: Record<string, string>
): Promise<EmailTemplate> {
  const defaults = EMAIL_TEMPLATE_DEFAULTS[key];
  let subject = defaults.subject;
  let body = defaults.body;

  try {
    const stored = await db.siteSetting.findMany({
      where: {
        key: { in: [settingKey(key, "subject"), settingKey(key, "body")] },
      },
    });
    for (const setting of stored) {
      if (setting.key.endsWith("_subject")) subject = setting.value;
      if (setting.key.endsWith("_body")) body = setting.value;
    }
  } catch (error) {
    console.error(`Unable to load ${key} email template; using defaults`, error);
  }

  const renderedSubject = renderTokens(subject, variables).replace(/[\r\n]+/g, " ").trim();
  const renderedBody = renderTokens(body, variables);
  return {
    subject: renderedSubject,
    html: wrap(textToHtml(renderedBody), renderedSubject),
    text: renderedBody,
  };
}

export function getEmailTemplateSampleVariables(
  key: EmailTemplateKey
): Record<string, string> {
  if (key === "order_confirmation") {
    return {
      name: "Research Customer",
      orderNumber: "OVI-PREVIEW-001",
      items: "Retatrutide (GLP-3) — 10 mg × 1: $80.00 CAD",
      total: "$80.00 CAD",
      etransferEmail: "ovipeps@gmail.com",
      autodepositName: "IN Z",
    };
  }
  if (key === "affiliate_approved") {
    return {
      name: "Affiliate Partner",
      affiliateUrl: `${siteUrl}/account/affiliate`,
    };
  }
  return {
    name: "Research Customer",
    resetUrl: `${siteUrl}/account/reset-password?token=preview-only`,
  };
}

interface SendEmailOptions {
  attachments?: Attachment[];
  idempotencyKey?: string;
}

export async function sendEmail(
  to: string,
  template: EmailTemplate,
  options: SendEmailOptions = {}
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn(`[Email not sent: Resend sender is not fully configured] To: ${to} | Subject: ${template.subject}`);
    return {
      success: false,
      error: "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured",
    };
  }
  const { data, error } = await new Resend(apiKey).emails.send(
    {
      from,
      replyTo: process.env.RESEND_REPLY_TO ?? "ovipeps@gmail.com",
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments: options.attachments,
    },
    { idempotencyKey: options.idempotencyKey }
  );
  if (error) {
    console.error("Resend email failed", error);
    return { success: false, error: error.message };
  }
  return { success: true, id: data?.id };
}
