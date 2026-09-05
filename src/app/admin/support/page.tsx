import { SupportInbox } from "@/components/admin/support-inbox";
import { db } from "@/lib/db";
import { ensureSupportConversationSchema } from "@/lib/support-conversations";

export const dynamic = "force-dynamic";
export default async function SupportPage() {
  await ensureSupportConversationSchema();
  const conversations = await db.supportConversation.findMany({ orderBy: { createdAt: "desc" } });
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Customer Messages</h1><p className="mt-1 text-sm text-muted-foreground">Reply as OVIpeps. Sending a response automatically cancels the 20-hour reminder.</p></div><SupportInbox initialConversations={conversations.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(), respondedAt: item.respondedAt?.toISOString() ?? null, reminderSentAt: item.reminderSentAt?.toISOString() ?? null }))} /></div>;
}
