"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Variant = { id: string; name: string; sku: string; price: number; stockQuantity: number };
type Product = { id: string; name: string; slug: string; published: boolean; variants: Variant[] };

function stockStyle(quantity: number) {
  if (quantity <= 0) return "border-red-300 bg-red-50";
  if (quantity <= 4) return "border-amber-300 bg-amber-50";
  return "border-emerald-200 bg-emerald-50/40";
}

export function InventoryManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function send(url: string, method: string, body: unknown, key: string) {
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save changes");
      setMessage("Saved. Shop inventory and pricing are now updated.");
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save changes");
      return false;
    } finally {
      setBusy(null);
    }
  }

  return <div className="space-y-5">
    {message && <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">{message}</div>}
    <form className="grid gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:grid-cols-[2fr_1fr_auto]" onSubmit={async (event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      const form = event.currentTarget;
      const saved = await send("/api/admin/products", "POST", { name: data.get("name"), researchCategory: data.get("category") }, "new-product");
      if (saved) form.reset();
    }}>
      <Input name="name" placeholder="New product name" required />
      <Input name="category" placeholder="Research category" />
      <Button type="submit" disabled={busy === "new-product"}><Plus className="h-4 w-4" /> Add product</Button>
    </form>

    {products.map((product) => <section key={product.id} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div><h2 className="font-semibold text-navy-deep">{product.name}</h2><p className="text-xs text-muted-foreground">/shop/{product.slug}</p></div>
        <Button size="sm" variant="outline" onClick={() => void send(`/api/admin/products/${product.id}`, "PATCH", { published: !product.published }, `publish-${product.id}`)}>{product.published ? "Hide from shop" : "Publish in shop"}</Button>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
        <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="px-4 py-2">Vial size</th><th className="px-4 py-2">SKU</th><th className="px-4 py-2">Price (CAD)</th><th className="px-4 py-2">Available vials</th><th className="px-4 py-2">Status</th><th /></tr></thead>
        <tbody>{product.variants.map((variant) => <VariantRow key={variant.id} variant={variant} busy={busy === variant.id} onSave={(body) => send(`/api/admin/variants/${variant.id}`, "PATCH", body, variant.id)} />)}</tbody>
      </table></div>
      <form className="grid gap-2 border-t border-border bg-muted/20 p-3 sm:grid-cols-5" onSubmit={async (event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        const form = event.currentTarget;
        const saved = await send(`/api/admin/products/${product.id}/variants`, "POST", { size: data.get("size"), sku: data.get("sku"), price: Number(data.get("price")), stockQuantity: Number(data.get("stock")) }, `new-${product.id}`);
        if (saved) form.reset();
      }}>
        <Input name="size" placeholder="Vial size, e.g. 10mg" required /><Input name="sku" placeholder="Unique SKU" required /><Input name="price" type="number" min="0" step="0.01" placeholder="Price" required /><Input name="stock" type="number" min="0" step="1" placeholder="Inventory" required /><Button type="submit" variant="outline" disabled={busy === `new-${product.id}`}><Plus className="h-4 w-4" /> Add vial size</Button>
      </form>
    </section>)}
  </div>;
}

function VariantRow({ variant, busy, onSave }: { variant: Variant; busy: boolean; onSave: (body: unknown) => void }) {
  const [size, setSize] = useState(variant.name); const [price, setPrice] = useState(String(variant.price)); const [stock, setStock] = useState(String(variant.stockQuantity)); const quantity = Number(stock);
  return <tr className={cn("border-b border-border/60", stockStyle(Number.isFinite(quantity) ? quantity : variant.stockQuantity))}>
    <td className="px-4 py-3"><Input value={size} onChange={(e) => setSize(e.target.value)} /></td><td className="px-4 py-3 font-mono text-xs">{variant.sku}</td><td className="px-4 py-3"><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></td><td className="px-4 py-3"><Input type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} /></td><td className="px-4 py-3 font-semibold">{quantity <= 0 ? "RESTOCKING" : quantity <= 4 ? "LOW STOCK" : "In stock"}</td><td className="px-4 py-3"><Button size="sm" disabled={busy} onClick={() => onSave({ size, price: Number(price), stockQuantity: Number(stock) })}><Save className="h-4 w-4" /> Save</Button></td>
  </tr>;
}
