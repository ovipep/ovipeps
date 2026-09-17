import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { getBusinessLedger } from "@/lib/business-ledger";
import { formatCurrency } from "@/lib/utils";
import { addLedgerEntry, updateLedgerEntry } from "./actions";

const dateText = (date: Date) => date.toISOString().slice(0, 10);

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; edit?: string }> }) {
  const params = await searchParams;
  const now = new Date();
  const fromDefault = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const fromText = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : dateText(fromDefault);
  const toText = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : dateText(now);
  const { rows, variants } = await getBusinessLedger(new Date(`${fromText}T00:00:00.000Z`), new Date(`${toText}T23:59:59.999Z`));
  const income = rows.reduce((sum, row) => sum + (row.type === "INCOME" ? row.merchandise + row.shipping : 0), 0);
  const tax = rows.reduce((sum, row) => sum + row.tax, 0);
  const expenses = rows.reduce((sum, row) => sum + row.expense, 0);
  const editingRow = params.edit ? rows.find((row) => row.manualId === params.edit) : undefined;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold text-navy-deep">Business Ledger</h1><p className="mt-1 text-sm text-muted-foreground">Live paid orders, shipping income, manual income and expenses, plus current inventory.</p></div><Link className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href={`/api/admin/ledger/export?from=${fromText}&to=${toText}`}>Download CSV</Link></div>
    <form method="get" className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-medium">From<Input name="from" type="date" defaultValue={fromText}/></label><label className="text-sm font-medium">To<Input name="to" type="date" defaultValue={toText}/></label><Button type="submit" className="self-end">Run ledger</Button></form>
    <div className="grid gap-3 sm:grid-cols-4">{[["Income",income],["Tax collected",tax],["Expenses",expenses],["Net cash",income+tax-expenses]].map(([label,value])=><div key={String(label)} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{formatCurrency(Number(value))}</p></div>)}</div>
    <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-semibold">Add income or expense</summary><p className="mt-3 text-sm text-muted-foreground">Enter the amount before tax and shipping, then record HST and shipping separately below.</p><form action={addLedgerEntry} className="mt-4 grid gap-4 sm:grid-cols-3">
      <label className="space-y-1.5 text-sm font-medium">Transaction date<Input name="transactionAt" type="date" required/></label>
      <label className="space-y-1.5 text-sm font-medium">Entry type<select name="entryType" className="block h-10 w-full rounded-md border bg-background px-3"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label>
      <label className="space-y-1.5 text-sm font-medium">Category<Input name="category" placeholder="Example: Office supplies" required/></label>
      <label className="space-y-1.5 text-sm font-medium">Description<Input name="description" placeholder="What was purchased or received?" required/></label>
      <label className="space-y-1.5 text-sm font-medium">Original amount<span className="block text-xs font-normal text-muted-foreground">Amount before HST and shipping</span><Input name="amount" type="number" min="0" step="0.01" placeholder="0.00" required/></label>
      <label className="space-y-1.5 text-sm font-medium">Currency<span className="block text-xs font-normal text-muted-foreground">USD converts automatically to CAD</span><select name="currency" defaultValue="CAD" className="block h-10 w-full rounded-md border bg-background px-3"><option value="CAD">CAD</option><option value="USD">USD — automatic daily conversion</option></select></label>
      <label className="space-y-1.5 text-sm font-medium">Shipping amount<span className="block text-xs font-normal text-muted-foreground">Postage, courier, delivery or freight</span><Input name="shippingAmount" type="number" min="0" step="0.01" placeholder="0.00" defaultValue="0"/></label>
      <label className="space-y-1.5 text-sm font-medium">HST / tax amount<span className="block text-xs font-normal text-muted-foreground">Tax portion only—not the total</span><Input name="taxAmount" type="number" min="0" step="0.01" placeholder="0.00" defaultValue="0"/></label>
      <label className="space-y-1.5 text-sm font-medium">Payment method<Input name="paymentMethod" placeholder="Example: Credit card"/></label>
      <label className="space-y-1.5 text-sm font-medium">Reference<Input name="reference" placeholder="Receipt, invoice or order number"/></label>
      <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Notes<Input name="notes" placeholder="Optional additional details"/></label>
      <Button type="submit" className="self-end">Save entry</Button>
    </form></details>
    {editingRow && <div id="edit-entry" className="rounded-xl border-2 border-primary bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Edit manual ledger entry</h2><p className="mt-1 text-sm text-muted-foreground">Correct the fields below and save your changes. The exchange rate will be recalculated if the date, currency or amount changes.</p></div><Link className="text-sm font-medium text-primary underline" href={`/admin/ledger?from=${fromText}&to=${toText}`}>Cancel editing</Link></div><form action={updateLedgerEntry} className="mt-4 grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="id" value={editingRow.manualId ?? ""}/>
      <label className="space-y-1.5 text-sm font-medium">Transaction date<Input name="transactionAt" type="date" defaultValue={dateText(editingRow.date)} required/></label>
      <label className="space-y-1.5 text-sm font-medium">Entry type<select name="entryType" defaultValue={editingRow.type} className="block h-10 w-full rounded-md border bg-background px-3"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label>
      <label className="space-y-1.5 text-sm font-medium">Category<Input name="category" defaultValue={editingRow.category} required/></label>
      <label className="space-y-1.5 text-sm font-medium">Description<Input name="description" defaultValue={editingRow.description} required/></label>
      <label className="space-y-1.5 text-sm font-medium">Original amount<span className="block text-xs font-normal text-muted-foreground">Amount before HST and shipping</span><Input name="amount" type="number" min="0" step="0.01" defaultValue={editingRow.foreignAmount} required/></label>
      <label className="space-y-1.5 text-sm font-medium">Currency<span className="block text-xs font-normal text-muted-foreground">USD converts automatically to CAD</span><select name="currency" defaultValue={editingRow.currency} className="block h-10 w-full rounded-md border bg-background px-3"><option value="CAD">CAD</option><option value="USD">USD — automatic daily conversion</option></select></label>
      <label className="space-y-1.5 text-sm font-medium">Shipping amount<span className="block text-xs font-normal text-muted-foreground">Postage, courier, delivery or freight</span><Input name="shippingAmount" type="number" min="0" step="0.01" defaultValue={editingRow.shipping}/></label>
      <label className="space-y-1.5 text-sm font-medium">HST / tax amount<span className="block text-xs font-normal text-muted-foreground">Tax portion only—not the total</span><Input name="taxAmount" type="number" min="0" step="0.01" defaultValue={editingRow.tax}/></label>
      <label className="space-y-1.5 text-sm font-medium">Payment method<Input name="paymentMethod" defaultValue={editingRow.paymentMethod}/></label>
      <label className="space-y-1.5 text-sm font-medium">Reference<Input name="reference" defaultValue={editingRow.reference}/></label>
      <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Notes<Input name="notes" defaultValue={editingRow.notes}/></label>
      <Button type="submit" className="self-end">Save changes</Button>
    </form></div>}
    <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40 text-left">{["Date","Type","Category","Description","Income","Shipping","Tax","Expense","Net","Reference","Action"].map(header=><th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map(row=><tr key={row.id} className="border-b"><td className="whitespace-nowrap px-3 py-3">{dateText(row.date)}</td><td className="px-3 py-3">{row.type}</td><td className="px-3 py-3">{row.category}</td><td className="min-w-80 px-3 py-3">{row.description}</td><td className="px-3 py-3 text-right">{formatCurrency(row.merchandise)}</td><td className="px-3 py-3 text-right">{formatCurrency(row.shipping)}</td><td className="px-3 py-3 text-right">{formatCurrency(row.tax)}</td><td className="px-3 py-3 text-right">{formatCurrency(row.expense)}</td><td className="px-3 py-3 text-right font-medium">{formatCurrency(row.total)}</td><td className="px-3 py-3">{row.reference}</td><td className="px-3 py-3">{row.manualId ? <Link className="font-medium text-primary underline" href={`/admin/ledger?from=${fromText}&to=${toText}&edit=${row.manualId}#edit-entry`}>Edit</Link> : <span className="text-xs text-muted-foreground">From order</span>}</td></tr>) : <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">No ledger entries in this date range.</td></tr>}</tbody></table></div>
    <div className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Current inventory</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{variants.map(variant=><div key={variant.id} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"><span>{variant.product.name} — {variant.name}</span><strong>{variant.stockQuantity}</strong></div>)}</div></div>
  </div>;
}
