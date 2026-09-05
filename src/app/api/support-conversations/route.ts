import { z } from "zod";
import { db } from "@/lib/db";
import { createSupportReference, ensureSupportConversationSchema, scheduleSupportReminder } from "@/lib/support-conversations";

const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), message: z.string().trim().min(10).max(3000) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please enter a valid name, email, and message." }, { status: 400 });
  await ensureSupportConversationSchema();
  const reference = createSupportReference();
  const conversation = await db.supportConversation.create({ data: { reference, ...parsed.data } });
  const reminderEmailId = await scheduleSupportReminder({ reference, ...parsed.data }).catch(error => { console.error("Support reminder scheduling failed", error); return null; });
  if (reminderEmailId) await db.supportConversation.update({ where: { id: conversation.id }, data: { reminderEmailId } });
  return Response.json({ success: true, reference });
}
