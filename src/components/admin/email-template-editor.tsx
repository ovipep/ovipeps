"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EditableEmailTemplate } from "@/lib/emails";

export function EmailTemplateEditor({
  template,
}: {
  template: EditableEmailTemplate;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [testEmail, setTestEmail] = useState("ovipeps@gmail.com");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/emails/templates/${template.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Unable to save template");
      setMessage("Template saved. New emails will use this version.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save template");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!window.confirm(`Send a test of ${template.label} to ${testEmail}?`)) return;
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/emails/templates/${template.key}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail }),
        }
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Unable to send test email");
      setMessage(`Test email sent to ${testEmail}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send test email");
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-navy-deep">{template.label}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
      </div>

      <Input
        label="Subject line"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        maxLength={200}
        required
      />
      <Textarea
        label="Email message"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={16}
        maxLength={20_000}
        required
      />

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Available automatic details
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {template.variables.map((variable) => (
            <code
              key={variable}
              className="rounded bg-card px-2 py-1 text-xs text-navy-deep"
            >
              {`{{${variable}}}`}
            </code>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Keep these bracketed details wherever the customer-specific information
          should appear.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || testing}>
          {saving ? "Saving…" : "Save template"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || testing}
          onClick={() => {
            setSubject(template.defaultSubject);
            setBody(template.defaultBody);
            setMessage("Defaults restored in the editor. Select Save template to apply them.");
            setError(null);
          }}
        >
          Restore defaults
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input
          label="Send a test email"
          type="email"
          value={testEmail}
          onChange={(event) => setTestEmail(event.target.value)}
          required
        />
        <Button
          type="button"
          variant="secondary"
          disabled={saving || testing || !testEmail}
          onClick={sendTest}
        >
          {testing ? "Sending…" : "Send test"}
        </Button>
      </div>

      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </form>
  );
}
