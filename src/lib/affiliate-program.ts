export const AFFILIATE_CUSTOMER_DISCOUNT_RATE = 5;
export const AFFILIATE_MONTHLY_MINIMUM = 300;
export const AFFILIATE_MAX_MISSED_MONTHS = 3;

export const AFFILIATE_COMMISSION_TIERS = [
  { minimum: 0, maximum: 1499.99, rate: 10 },
  { minimum: 1500, maximum: 4999.99, rate: 20 },
  { minimum: 5000, maximum: null, rate: 25 },
] as const;

export function getAffiliateCommissionRate(monthlySales: number) {
  if (monthlySales >= 5000) return 25;
  if (monthlySales >= 1500) return 20;
  return 10;
}

export function getNextAffiliateTier(monthlySales: number) {
  if (monthlySales < 1500) return { threshold: 1500, rate: 20 };
  if (monthlySales < 5000) return { threshold: 5000, rate: 25 };
  return null;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getUtcMonthBounds(date: Date) {
  return {
    start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)),
  };
}

export function getPeriodBounds(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function getAffiliateMonthProgress(monthlySales: number, now = new Date()) {
  const qualifyingSales = roundMoney(Math.max(0, monthlySales));
  const nextTier = getNextAffiliateTier(qualifyingSales);
  const { start } = getUtcMonthBounds(now);
  return {
    qualifyingSales,
    commissionRate: getAffiliateCommissionRate(qualifyingSales),
    minimumMet: qualifyingSales >= AFFILIATE_MONTHLY_MINIMUM,
    amountToMinimum: roundMoney(Math.max(0, AFFILIATE_MONTHLY_MINIMUM - qualifyingSales)),
    nextTierThreshold: nextTier?.threshold ?? null,
    nextTierRate: nextTier?.rate ?? null,
    amountToNextTier: nextTier ? roundMoney(Math.max(0, nextTier.threshold - qualifyingSales)) : 0,
    periodLabel: new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(start),
    updatedAt: now.toISOString(),
  };
}
