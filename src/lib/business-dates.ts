const BUSINESS_TIME_ZONE = "America/Toronto";

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function businessDateText(date: Date) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Interpret a date input as midnight in the business's Eastern time zone. */
export function businessDateFromText(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid business date.");
  const [, yearText, monthText, dayText] = match;
  const candidate = Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText));
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(candidate));
  const parts = Object.fromEntries(local.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return new Date(candidate - (asUtc - candidate));
}

export function businessDateRange(fromText: string, toText: string) {
  const [year, month, day] = toText.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return {
    from: businessDateFromText(fromText),
    to: new Date(businessDateFromText(nextDay).getTime() - 1),
  };
}
