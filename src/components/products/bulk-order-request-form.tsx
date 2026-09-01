"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, PackagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductOption {
  id: string;
  name: string;
  slug: string;
}

export function BulkOrderRequestForm({
  products,
  initialProductSlug,
}: {
  products: ProductOption[];
  initialProductSlug?: string;
}) {
  const initialProduct = products.find((product) => product.slug === initialProductSlug);
  const [selected, setSelected] = useState<Record<string, number>>(
    initialProduct ? { [initialProduct.id]: 1 } : {}
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmationId, setConfirmationId] = useState("");
  const selectedProducts = useMemo(
    () => products.filter((product) => selected[product.id] !== undefined),
    [products, selected]
  );

  function toggleProduct(id: string) {
    setSelected((current) => {
      const next = { ...current };
      if (next[id] !== undefined) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    if (selectedProducts.length === 0) {
      setError("Select at least one product.");
      return;
    }
    setSubmitting(true);
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/bulk-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          additionalContext: form.get("additionalContext"),
          items: selectedProducts.map((product) => ({
            productId: product.id,
            kits: selected[product.id],
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit your request.");
      setConfirmationId(result.id);
      formElement.reset();
      setSelected({});
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmationId) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-6 w-6" /></div>
        <h2 className="mt-4 text-2xl font-semibold text-navy-deep">Request received</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Your request is now Pending Decision. A confirmation has been sent to your email, and we will respond within 24 hours with discounted pricing and an ETA.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Reference: {confirmationId}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-7 rounded-3xl border border-sky/15 bg-white p-6 shadow-xl shadow-sky/10 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-navy-deep">First name
          <input name="firstName" required maxLength={80} autoComplete="given-name" className="h-11 w-full rounded-xl border border-sky/20 px-3 font-normal outline-none focus:border-sky focus:ring-2 focus:ring-sky/15" />
        </label>
        <label className="space-y-2 text-sm font-semibold text-navy-deep">Last name
          <input name="lastName" required maxLength={80} autoComplete="family-name" className="h-11 w-full rounded-xl border border-sky/20 px-3 font-normal outline-none focus:border-sky focus:ring-2 focus:ring-sky/15" />
        </label>
      </div>
      <label className="block space-y-2 text-sm font-semibold text-navy-deep">Email
        <input name="email" type="email" required maxLength={254} autoComplete="email" className="h-11 w-full rounded-xl border border-sky/20 px-3 font-normal outline-none focus:border-sky focus:ring-2 focus:ring-sky/15" />
      </label>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-navy-deep">Products</p>
          <p className="mt-1 text-xs text-muted-foreground">Select one or more products. Each kit contains 10 units.</p>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-sky/20 bg-white px-3 text-left text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/15">
            <span className={selectedProducts.length ? "text-foreground" : "text-muted-foreground"}>{selectedProducts.length ? `${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"} selected` : "Select products"}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-sky/20 bg-white p-2 shadow-xl">
              {products.map((product) => {
                const checked = selected[product.id] !== undefined;
                return <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-sky/5">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-sky bg-sky text-white" : "border-slate-300"}`}>{checked && <Check className="h-3.5 w-3.5" />}</span>
                  {product.name}
                </button>;
              })}
            </div>
          )}
        </div>

        {selectedProducts.length > 0 && <div className="grid gap-3">
          {selectedProducts.map((product) => <div key={product.id} className="flex flex-col gap-3 rounded-2xl border border-sky/10 bg-sky/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><PackagePlus className="h-5 w-5 text-sky" /><div><p className="text-sm font-semibold text-navy-deep">{product.name}</p><p className="text-xs text-muted-foreground">{selected[product.id]} kit{selected[product.id] === 1 ? "" : "s"} = {selected[product.id] * 10} units</p></div></div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Number of kits
                <input type="number" min={1} max={1000} required value={selected[product.id]} onChange={(event) => setSelected((current) => ({ ...current, [product.id]: Math.max(1, Number.parseInt(event.target.value) || 1) }))} className="ml-2 h-10 w-24 rounded-lg border border-sky/20 bg-white px-3 text-sm text-foreground" />
              </label>
              <button type="button" aria-label={`Remove ${product.name}`} onClick={() => toggleProduct(product.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-white hover:text-error"><X className="h-4 w-4" /></button>
            </div>
          </div>)}
        </div>}
      </div>

      <label className="block space-y-2 text-sm font-semibold text-navy-deep">Additional Context/Information
        <textarea name="additionalContext" rows={5} maxLength={5000} className="w-full resize-y rounded-xl border border-sky/20 px-3 py-3 font-normal outline-none focus:border-sky focus:ring-2 focus:ring-sky/15" placeholder="Share timing, volume, or other information that may help us prepare your quote." />
      </label>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <Button type="submit" size="lg" disabled={submitting} className="w-full">{submitting ? "Submitting…" : "Submit Bulk Order Request"}</Button>
    </form>
  );
}
