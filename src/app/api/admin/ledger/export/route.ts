import { requireAdmin } from "@/lib/auth";
import { getBusinessLedger } from "@/lib/business-ledger";
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"','""')}"`;
export async function GET(request: Request) {
  if (!(await requireAdmin())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url), now = new Date();
  const fromText = url.searchParams.get("from") ?? `${now.getUTCFullYear()}-01-01`;
  const toText = url.searchParams.get("to") ?? now.toISOString().slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromText) || !/^\d{4}-\d{2}-\d{2}$/.test(toText)) return new Response("Invalid date",{status:400});
  const { rows } = await getBusinessLedger(new Date(`${fromText}T00:00:00.000Z`), new Date(`${toText}T23:59:59.999Z`));
  const lines = [["Date","Type","Category","Description","Currency","Foreign Amount","FX Rate to CAD","FX Rate Date","Merchandise Income CAD","Shipping Income CAD","Tax CAD","Expense CAD","Net CAD","Payment Method","Reference","Notes"].map(csv).join(","), ...rows.map(r=>[r.date.toISOString().slice(0,10),r.type,r.category,r.description,r.currency,r.foreignAmount,r.fxRate,r.fxRateDate.toISOString().slice(0,10),r.merchandise,r.shipping,r.tax,r.expense,r.total,r.paymentMethod,r.reference,r.notes].map(csv).join(","))];
  return new Response(lines.join("\r\n"), { headers: { "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":`attachment; filename="ovipeps-ledger-${fromText}-to-${toText}.csv"`, "Cache-Control":"no-store" } });
}
