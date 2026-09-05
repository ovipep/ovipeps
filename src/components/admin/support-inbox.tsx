"use client";

import { useState } from "react";

type Conversation = { id: string; reference: string; name: string; email: string; message: string; status: string; response: string | null; createdAt: string };

export function SupportInbox({ initialConversations }: { initialConversations: Conversation[] }) {
  const [items, setItems] = useState(initialConversations);
  const [busy, setBusy] = useState<string | null>(null);
  async function reply(id: string, response: string) {
    setBusy(id);
    const result = await fetch(`/api/admin/support/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response }) });
    const body = await result.json().catch(() => ({})); setBusy(null);
    if (!result.ok) return window.alert(body.error ?? "Unable to send response.");
    setItems(current => current.map(item => item.id === id ? { ...item, status: "RESPONDED", response } : item));
  }
  return <div className="space-y-4">{items.length === 0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No customer messages yet.</div> : items.map(item => <article key={item.id} className="rounded-xl border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-navy-deep">{item.name} <span className="font-normal text-muted-foreground">({item.email})</span></p><p className="mt-1 text-xs text-muted-foreground">{item.reference} · {item.createdAt.replace("T", " ").slice(0, 16)} UTC</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "RESPONDED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{item.status === "RESPONDED" ? "Responded" : "Awaiting response"}</span></div>
    <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{item.message}</p>
    {item.status === "RESPONDED" ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm"><strong>OVIpeps response:</strong><p className="mt-1 whitespace-pre-wrap">{item.response}</p></div> : <ReplyForm busy={busy === item.id} onReply={(response) => reply(item.id, response)} />}
  </article>)}</div>;
}

function ReplyForm({ busy, onReply }: { busy: boolean; onReply: (response: string) => void }) {
  const [response, setResponse] = useState("");
  return <div className="mt-4"><label className="text-sm font-semibold">Reply as OVIpeps</label><textarea value={response} onChange={event => setResponse(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Type your response…" /><button type="button" disabled={busy || response.trim().length < 2} onClick={() => onReply(response.trim())} className="mt-2 rounded-lg bg-navy-deep px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Sending…" : "Send response"}</button></div>;
}
