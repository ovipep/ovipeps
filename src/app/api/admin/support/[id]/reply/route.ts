import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelSupportReminder, ensureSupportConversationSchema, sendEmail, supportReplyEmail } from "@/lib/support-conversations";

const schema = z.object({ response: z.string().trim().min(2).max(5000) });
export async function POST(request: Request, context: RouteContext<"/api/admin/support/[id]/reply">) {
  if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please enter a response." }, { status: 400 });
  await ensureSupportConversationSchema(); const { id } = await context.params;
  const conversation = await db.supportConversation.findUnique({ where: { id } });
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const delivery = await sendEmail(conversation.email, supportReplyEmail({ name: conversation.name, reference: conversation.reference, response: parsed.data.response }), { idempotencyKey: `support-reply-${id}` });
  if (!delivery.success) return Response.json({ error: "The response email could not be sent." }, { status: 502 });
  await cancelSupportReminder(conversation.reminderEmailId);
  const updated = await db.supportConversation.update({ where: { id }, data: { response: parsed.data.response, status: "RESPONDED", respondedAt: new Date() } });
  return Response.json({ conversation: updated });
}
