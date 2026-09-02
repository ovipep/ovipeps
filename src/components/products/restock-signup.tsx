"use client";

import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProductOption = { id: string; name: string };

export function RestockSignup({ products }: { products: ProductOption[] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [allInventory, setAllInventory] = useState(false);
  const [notificationType, setNotificationType] = useState<"ONE_TIME" | "ONGOING">("ONE_TIME");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/restock-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, productIds: selected, allInventory, notificationType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not add you to the list");
      setMessage({
        type: "success",
        text: notificationType === "ONGOING"
          ? "You're on the list! We'll email you whenever your selected products are restocked."
          : "You're on the list! We'll email you when your selected product is back in stock.",
      });
      setEmail("");
      setSelected([]);
      setAllInventory(false);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "We could not add you to the list" });
    } finally {
      setBusy(false);
    }
  }

  const selectionLabel = allInventory
    ? "All Inventory"
    : selected.length === 0
      ? "Select one or more products"
      : `${selected.length} product${selected.length === 1 ? "" : "s"} selected`;

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-emerald-600/25 bg-gradient-to-r from-emerald-600/10 via-green-500/10 to-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-600 p-2.5 text-white"><Bell className="h-5 w-5" /></span>
          <span><span className="block font-semibold text-navy-deep">Notify Me When Restocked</span><span className="mt-0.5 block text-sm text-muted-foreground">Choose the products you want us to watch.</span></span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-emerald-700 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form onSubmit={submit} className="border-t border-emerald-600/20 px-5 py-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block text-sm font-semibold text-navy-deep">
              Email address <span className="text-burgundy">*</span>
              <Input className="mt-2 bg-white" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>

            <div className="text-sm font-semibold text-navy-deep">
              Products <span className="text-burgundy">*</span>
              <details className="group relative mt-2">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-md border border-input bg-white px-3 py-2 font-normal text-foreground shadow-xs">
                  {selectionLabel}<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-lg lg:absolute lg:z-20 lg:w-full">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 font-semibold hover:bg-emerald-600/5">
                    <input type="checkbox" checked={allInventory} onChange={(event) => { setAllInventory(event.target.checked); if (event.target.checked) setSelected([]); }} />
                    All Inventory
                  </label>
                  {products.map((product) => (
                    <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 font-normal hover:bg-emerald-600/5">
                      <input type="checkbox" disabled={allInventory} checked={selected.includes(product.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} />
                      {product.name}
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-navy-deep">How long should we notify you?</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-4 ${notificationType === "ONE_TIME" ? "border-emerald-600 bg-emerald-600/5" : "border-border bg-white"}`}>
                <input className="mr-2" type="radio" name="duration" checked={notificationType === "ONE_TIME"} onChange={() => setNotificationType("ONE_TIME")} />
                <span className="font-semibold">Only notify me for the next restock</span>
                <span className="mt-1 block pl-6 text-xs font-normal leading-relaxed text-muted-foreground">Each selected product is removed after its first successful restock email.</span>
              </label>
              <label className={`cursor-pointer rounded-xl border p-4 ${notificationType === "ONGOING" ? "border-emerald-600 bg-emerald-600/5" : "border-border bg-white"}`}>
                <input className="mr-2" type="radio" name="duration" checked={notificationType === "ONGOING"} onChange={() => setNotificationType("ONGOING")} />
                <span className="font-semibold">Notify me for all future restocks</span>
                <span className="mt-1 block pl-6 text-xs font-normal leading-relaxed text-muted-foreground">Your subscription stays active and every email includes a secure unsubscribe link.</span>
              </label>
            </div>
          </fieldset>

          {message && <p role="status" className={`mt-4 rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{message.text}</p>}
          <Button className="mt-5 bg-emerald-600 text-white hover:bg-emerald-700" type="submit" disabled={busy || (!allInventory && selected.length === 0)}>
            <Bell className="h-4 w-4" /> {busy ? "Adding you..." : "Notify Me When Restocked"}
          </Button>
        </form>
      )}
    </section>
  );
}
