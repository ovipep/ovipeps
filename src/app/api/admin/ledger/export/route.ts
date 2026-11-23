import { requireAdmin } from "@/lib/auth";
import { getBusinessLedger } from "@/lib/business-ledger";
import { businessDateRange, businessDateText } from "@/lib/business-dates";
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"','""')}"`;
export async function GET(request: Request) {
  if (!(await requireAdmin())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url), now = new Date();
  const fromText = url.searchParams.get("from") ?? `${businessDateText(now).slice(0, 4)}-01-01`;
  const toText = url.searchParams.get("to") ?? businessDateText(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromText) || !/^\d{4}-\d{2}-\d{2}$/.test(toText)) return new Response("Invalid date",{status:400});
  const { from, to } = businessDateRange(fromText, toText);
  const { rows } = await getBusinessLedger(from, to);
  const lines = [["Date","Type","Category","Description","Currency","Foreign Amount","FX Rate to CAD","FX Rate Date","Merchandise Income CAD","Shipping Income CAD","Tax CAD","Expense CAD","Net CAD","Payment Method","Reference","Notes"].map(csv).join(","), ...rows.map(r=>[businessDateText(r.date),r.type,r.category,r.description,r.currency,r.foreignAmount,r.fxRate,businessDateText(r.fxRateDate),r.merchandise,r.shipping,r.tax,r.expense,r.total,r.paymentMethod,r.reference,r.notes].map(csv).join(","))];
  return new Response(lines.join("\r\n"), { headers: { "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":`attachment; filename="ovipeps-ledger-${fromText}-to-${toText}.csv"`, "Cache-Control":"no-store" } });
}
