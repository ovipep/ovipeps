"use client";

import { FormEvent, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string }>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setResult({});
    const form = event.currentTarget;
    const response = await fetch("/api/support-conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const body = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) return setResult({ error: body.error ?? "Unable to send your message." });
    form.reset(); setResult({ success: `Message sent. Reference: ${body.reference}` });
  }

  return <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
    {open ? <section id="support-chat-panel" aria-label="Message OVIpeps" className="w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sky/20 bg-white shadow-2xl shadow-slate-950/20">
      <header className="flex items-center justify-between bg-gradient-to-r from-sky to-cyan px-5 py-4 text-white"><div><p className="font-bold">OVIpeps</p><p className="text-xs text-white/85">Customer support</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close support chat" className="rounded-full p-2 hover:bg-white/15"><X className="h-5 w-5" /></button></header>
      <form onSubmit={submit} className="space-y-3 p-5">
        <p className="text-sm text-slate-700">Send us a message and we’ll respond by email.</p>
        <p className="rounded-lg bg-sky/10 px-3 py-2 text-xs font-medium text-navy-deep">Not monitored live — responses are sent within 24 hours.</p>
        <label className="block text-xs font-semibold text-slate-700">Name<input name="name" required minLength={2} maxLength={100} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky" /></label>
        <label className="block text-xs font-semibold text-slate-700">Email<input name="email" required type="email" maxLength={254} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky" /></label>
        <label className="block text-xs font-semibold text-slate-700">Message<textarea name="message" required minLength={10} maxLength={3000} rows={4} className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-sky" /></label>
        {result.error ? <p role="alert" className="text-xs text-red-700">{result.error}</p> : null}
        {result.success ? <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{result.success}</p> : null}
        <button disabled={sending} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy-deep px-4 text-sm font-bold text-white disabled:opacity-60">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? "Sending…" : "Send message"}</button>
      </form>
    </section> : null}
    <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="support-chat-panel" className="flex min-h-14 items-center gap-2 rounded-full bg-gradient-to-r from-sky to-cyan px-4 text-white shadow-xl shadow-sky/25 transition hover:-translate-y-0.5"><MessageCircle className="h-6 w-6" /><span className="hidden pr-1 text-sm font-bold sm:inline">Message OVIpeps</span></button>
  </div>;
}
