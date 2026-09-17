const SOURCE = "Bank of Canada Valet API — FXUSDCAD";
const iso = (date: Date) => date.toISOString().slice(0, 10);

export async function getCadExchangeRate(currency: string, transactionDate: Date) {
  if (currency === "CAD") return { rate: 1, rateDate: transactionDate, source: "CAD transaction" };
  if (currency !== "USD") throw new Error("Automatic conversion currently supports CAD and USD only");
  const start = new Date(transactionDate);
  start.setUTCDate(start.getUTCDate() - 10);
  const response = await fetch(`https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?start_date=${iso(start)}&end_date=${iso(transactionDate)}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Bank of Canada exchange-rate service is unavailable");
  const data = await response.json() as { observations?: Array<{ d: string; FXUSDCAD?: { v?: string } }> };
  const observation = data.observations?.filter((row) => row.FXUSDCAD?.v).at(-1);
  const rate = Number(observation?.FXUSDCAD?.v);
  if (!observation || !Number.isFinite(rate) || rate <= 0) throw new Error("No Bank of Canada USD rate was available for that date");
  return { rate, rateDate: new Date(`${observation.d}T00:00:00.000Z`), source: SOURCE };
}
