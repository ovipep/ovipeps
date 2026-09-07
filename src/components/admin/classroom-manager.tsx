"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ManagedClassroomDocument {
  id: string;
  displayName: string;
  slug: string;
  fileName: string;
  mimeType: string;
  visible: boolean;
  sortOrder: number;
}

export function ClassroomManager({ initialDocuments }: { initialDocuments: ManagedClassroomDocument[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function parseResponse(response: Response) {
    const body = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(body.error || "The change could not be saved");
    return body;
  }

  async function addDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdding(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/classroom", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const added = (await parseResponse(response)) as unknown as ManagedClassroomDocument;
      setDocuments((current) => [...current, added]);
      event.currentTarget.reset();
      setMessage("Document added to Classroom.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add document");
    } finally {
      setAdding(false);
    }
  }

  async function updateDocument(id: string, formData: FormData, successMessage: string) {
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/classroom/${id}`, { method: "PATCH", body: formData });
      const updated = (await parseResponse(response)) as unknown as ManagedClassroomDocument;
      setDocuments((current) => current.map((item) => (item.id === id ? updated : item)));
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update document");
    } finally {
      setBusyId(null);
    }
  }

  async function removeDocument(document: ManagedClassroomDocument) {
    if (!window.confirm(`Remove ${document.displayName} and its document from Classroom?`)) return;
    setBusyId(document.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/classroom/${document.id}`, { method: "DELETE" });
      await parseResponse(response);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setMessage("Document removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove document");
    } finally {
      setBusyId(null);
    }
  }

  async function moveDocument(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= documents.length) return;
    const reordered = [...documents];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setDocuments(reordered);
    setBusyId(documents[index].id);
    try {
      const response = await fetch("/api/admin/classroom/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((item) => item.id) }),
      });
      await parseResponse(response);
      setMessage("Classroom order updated.");
    } catch (error) {
      setDocuments(documents);
      setMessage(error instanceof Error ? error.message : "Could not reorder documents");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addDocument} className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-navy-deep">Add a document</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.3fr_auto] md:items-end">
          <Input name="displayName" label="Peptide / compound name" placeholder="e.g. Retatrutide" required />
          <Input
            name="file"
            type="file"
            label="Document"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            hint="PDF, PNG, JPG, or WebP — maximum 4 MB"
            required
          />
          <Button type="submit" disabled={adding}>
            <Upload className="h-4 w-4" />
            {adding ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>

      {message ? (
        <p role="status" className="rounded-lg border border-sky/20 bg-sky/5 px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        {documents.map((document, index) => (
          <div key={document.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <input
                    defaultValue={document.displayName}
                    aria-label={`Display name for ${document.displayName}`}
                    onBlur={(event) => {
                      const value = event.currentTarget.value.trim();
                      if (value && value !== document.displayName) {
                        const data = new FormData();
                        data.set("displayName", value);
                        void updateDocument(document.id, data, "Display name updated.");
                      }
                    }}
                    className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold text-foreground hover:border-border focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <p className="truncate px-2 text-xs text-muted-foreground">{document.fileName}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === document.id}
                  onClick={() => {
                    const data = new FormData();
                    data.set("visible", String(!document.visible));
                    void updateDocument(document.id, data, document.visible ? "Document hidden." : "Document is now visible.");
                  }}
                >
                  {document.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {document.visible ? "Visible" : "Hidden"}
                </Button>

                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-2 border-sky/30 bg-card px-3 text-xs font-semibold text-foreground hover:bg-sky/5">
                  <Upload className="h-4 w-4" />
                  Replace
                  <input
                    type="file"
                    className="sr-only"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    disabled={busyId === document.id}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const data = new FormData();
                      data.set("file", file);
                      void updateDocument(document.id, data, "Document replaced.");
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                <Button variant="ghost" size="sm" onClick={() => moveDocument(index, -1)} disabled={index === 0 || busyId !== null} aria-label={`Move ${document.displayName} up`}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => moveDocument(index, 1)} disabled={index === documents.length - 1 || busyId !== null} aria-label={`Move ${document.displayName} down`}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => removeDocument(document)} disabled={busyId === document.id} aria-label={`Remove ${document.displayName}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
