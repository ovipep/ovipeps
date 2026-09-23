import { db } from "@/lib/db";
import {
  AFFILIATE_MAX_MISSED_MONTHS,
  AFFILIATE_MONTHLY_MINIMUM,
  getAffiliateCommissionRate,
  getPeriodBounds,
  getUtcMonthBounds,
  roundMoney,
} from "@/lib/affiliate-program";

interface ClickMeta {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  landingPage?: string;
}

function nextUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export async function evaluateAffiliateMonth(
  affiliateId: string,
  year: number,
  month: number
) {
  const affiliate = await db.affiliateAccount.findUnique({ where: { id: affiliateId } });
  if (!affiliate || affiliate.status === "INACTIVE") return null;

  const { start, end } = getPeriodBounds(year, month);
  const currentMonthStart = getUtcMonthBounds(new Date()).start;
  const firstFullMonth = nextUtcMonth(affiliate.minimumTrackingStartedAt);
  if (start < firstFullMonth || end > currentMonthStart) return null;

  const existing = await db.affiliateMonthlyPerformance.findUnique({
    where: {
      affiliateId_periodYear_periodMonth: { affiliateId, periodYear: year, periodMonth: month },
    },
  });
  if (existing) return existing;

  const commissions = await db.affiliateCommission.findMany({
    where: {
      affiliateId,
      createdAt: { gte: start, lt: end },
      status: { not: "REVERSED" },
    },
    select: { commissionableAmount: true, commissionAmount: true },
  });
  const qualifyingSales = roundMoney(
    commissions.reduce((sum, commission) => sum + commission.commissionableAmount, 0)
  );
  const commissionRate = getAffiliateCommissionRate(qualifyingSales);
  const commissionOwed = roundMoney(
    commissions.reduce((sum, commission) => sum + commission.commissionAmount, 0)
  );
  const minimumMet = qualifyingSales >= AFFILIATE_MONTHLY_MINIMUM;

  return db.$transaction(async (tx) => {
    const alreadyEvaluated = await tx.affiliateMonthlyPerformance.findUnique({
      where: {
        affiliateId_periodYear_periodMonth: { affiliateId, periodYear: year, periodMonth: month },
      },
    });
    if (alreadyEvaluated) return alreadyEvaluated;

    const created = await tx.affiliateMonthlyPerformance.create({
      data: {
        affiliateId,
        periodYear: year,
        periodMonth: month,
        qualifyingSales,
        commissionRate,
        commissionOwed,
        minimumMet,
        missedMinimumCount: 0,
        evaluatedAt: new Date(),
      },
    });

    const missedMinimumMonths = await tx.affiliateMonthlyPerformance.count({
      where: { affiliateId, minimumMet: false },
    });
    const shouldFreeze =
      !minimumMet &&
      missedMinimumMonths >= AFFILIATE_MAX_MISSED_MONTHS &&
      affiliate.status === "ACTIVE";

    await tx.affiliateMonthlyPerformance.update({
      where: { id: created.id },
      data: { missedMinimumCount: missedMinimumMonths },
    });
    await tx.affiliateAccount.update({
      where: { id: affiliateId },
      data: {
        missedMinimumMonths,
        commissionRate,
        ...(shouldFreeze ? { status: "SUSPENDED" as const, frozenAt: new Date() } : {}),
      },
    });

    return { ...created, missedMinimumCount: missedMinimumMonths };
  });
}

export async function reconcileAffiliateMinimums(affiliateId: string) {
  let affiliate = await db.affiliateAccount.findUnique({ where: { id: affiliateId } });
  if (!affiliate || affiliate.status !== "ACTIVE") return affiliate;

  const currentMonthStart = getUtcMonthBounds(new Date()).start;
  for (
    let cursor = nextUtcMonth(affiliate.minimumTrackingStartedAt);
    cursor < currentMonthStart;
    cursor = nextUtcMonth(cursor)
  ) {
    await evaluateAffiliateMonth(
      affiliate.id,
      cursor.getUTCFullYear(),
      cursor.getUTCMonth() + 1
    );
    affiliate = await db.affiliateAccount.findUnique({ where: { id: affiliateId } });
    if (!affiliate || affiliate.status !== "ACTIVE") break;
  }

  await refreshAffiliateCurrentMonthTier(affiliateId);
  return db.affiliateAccount.findUnique({ where: { id: affiliateId } });
}

export async function refreshAffiliateCurrentMonthTier(affiliateId: string) {
  const { start, end } = getUtcMonthBounds(new Date());
  const commissions = await db.affiliateCommission.findMany({
    where: {
      affiliateId,
      createdAt: { gte: start, lt: end },
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  const monthlySales = roundMoney(
    commissions.reduce((sum, row) => sum + row.commissionableAmount, 0)
  );
  const commissionRate = getAffiliateCommissionRate(monthlySales);
  const oldTotal = roundMoney(
    commissions.reduce((sum, row) => sum + row.commissionAmount, 0)
  );
  const newTotal = roundMoney(
    commissions.reduce(
      (sum, row) =>
        sum + roundMoney(row.commissionableAmount * (commissionRate / 100)),
      0
    )
  );
  const earningsDelta = roundMoney(newTotal - oldTotal);

  await db.$transaction(async (tx) => {
    for (const commission of commissions) {
      await tx.affiliateCommission.update({
        where: { id: commission.id },
        data: {
          commissionRate,
          commissionAmount: roundMoney(
            commission.commissionableAmount * (commissionRate / 100)
          ),
        },
      });
    }
    await tx.affiliateAccount.update({
      where: { id: affiliateId },
      data: {
        commissionRate,
        totalEarnings: { increment: earningsDelta },
        pendingEarnings: { increment: earningsDelta },
      },
    });
  });
}

export async function reconcileAllAffiliateMinimums() {
  const affiliates = await db.affiliateAccount.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  for (const affiliate of affiliates) {
    await reconcileAffiliateMinimums(affiliate.id);
  }
}

export async function resolveActiveAffiliate(code: string | null | undefined) {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) return null;

  let affiliate = await db.affiliateAccount.findUnique({ where: { code: normalizedCode } });
  if (!affiliate || affiliate.status !== "ACTIVE") return null;

  await reconcileAffiliateMinimums(affiliate.id);
  affiliate = await db.affiliateAccount.findUnique({ where: { id: affiliate.id } });
  return affiliate?.status === "ACTIVE" ? affiliate : null;
}

export async function trackAffiliateClick(code: string, meta: ClickMeta = {}) {
  const affiliate = await resolveActiveAffiliate(code);
  if (!affiliate) return null;

  const [click] = await db.$transaction([
    db.affiliateClick.create({
      data: {
        affiliateId: affiliate.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        referrer: meta.referrer,
        landingPage: meta.landingPage,
      },
    }),
    db.affiliateAccount.update({
      where: { id: affiliate.id },
      data: { totalClicks: { increment: 1 } },
    }),
  ]);

  return click;
}

export async function attributeOrder(orderId: string, affiliateCode: string | null | undefined) {
  const affiliate = await resolveActiveAffiliate(affiliateCode);
  if (!affiliate) return null;

  const attributionDaysSetting = await db.siteSetting.findUnique({
    where: { key: "affiliate_attribution_days" },
  });
  const attributionDays = Number(attributionDaysSetting?.value ?? 30);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + attributionDays);

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: { affiliateCode: affiliate.code, affiliateId: affiliate.id },
    }),
    db.affiliateAttribution.create({
      data: {
        affiliateId: affiliate.id,
        code: affiliate.code,
        expiresAt,
        converted: true,
      },
    }),
  ]);

  return affiliate;
}

export async function createCommission(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { commission: true },
  });

  if (!order?.affiliateId || order.commission) return null;

  // The affiliate was already validated when the order was attributed. A later
  // freeze must not erase commission from an order that was legitimately tied
  // to that affiliate while the account was active.
  await reconcileAffiliateMinimums(order.affiliateId);
  const affiliate = await db.affiliateAccount.findUnique({
    where: { id: order.affiliateId },
  });
  if (!affiliate) return null;

  const commissionableAmount = roundMoney(
    Math.max(0, order.subtotal - order.discountAmount)
  );
  if (commissionableAmount <= 0) return null;

  const commissionDate = order.paidAt ?? new Date();
  const { start, end } = getUtcMonthBounds(commissionDate);
  const existingCommissions = await db.affiliateCommission.findMany({
    where: {
      affiliateId: affiliate.id,
      createdAt: { gte: start, lt: end },
      status: { not: "REVERSED" },
    },
  });
  const combinedMonthlySales = roundMoney(
    commissionableAmount +
      existingCommissions.reduce((sum, row) => sum + row.commissionableAmount, 0)
  );
  const commissionRate = getAffiliateCommissionRate(combinedMonthlySales);
  const existingOldTotal = roundMoney(
    existingCommissions.reduce((sum, row) => sum + row.commissionAmount, 0)
  );
  const existingNewTotal = roundMoney(
    existingCommissions.reduce(
      (sum, row) => sum + roundMoney(row.commissionableAmount * (commissionRate / 100)),
      0
    )
  );
  const commissionAmount = roundMoney(commissionableAmount * (commissionRate / 100));
  const earningsDelta = roundMoney(existingNewTotal + commissionAmount - existingOldTotal);

  return db.$transaction(async (tx) => {
    for (const existing of existingCommissions) {
      await tx.affiliateCommission.update({
        where: { id: existing.id },
        data: {
          commissionRate,
          commissionAmount: roundMoney(
            existing.commissionableAmount * (commissionRate / 100)
          ),
        },
      });
    }

    const created = await tx.affiliateCommission.create({
      data: {
        affiliateId: affiliate.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderAmount: order.total,
        commissionableAmount,
        commissionRate,
        commissionAmount,
        status: "APPROVED",
        approvedAt: new Date(),
        createdAt: commissionDate,
      },
    });

    await tx.affiliateAccount.update({
      where: { id: affiliate.id },
      data: {
        commissionRate,
        totalOrders: { increment: 1 },
        totalEarnings: { increment: earningsDelta },
        pendingEarnings: { increment: earningsDelta },
      },
    });

    return created;
  });
}

const COMMISSION_ELIGIBLE_ORDER_STATUSES = [
  "PAYMENT_RECEIVED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
] as const;

export async function reconcilePaidAffiliateCommissions(affiliateId?: string) {
  const orders = await db.order.findMany({
    where: {
      affiliateId: affiliateId ? affiliateId : { not: null },
      status: { in: [...COMMISSION_ELIGIBLE_ORDER_STATUSES] },
      commission: { is: null },
    },
    select: { id: true, orderNumber: true },
    orderBy: { paidAt: "asc" },
  });

  const repaired: string[] = [];
  const failures: Array<{ orderNumber: string; error: string }> = [];

  for (const order of orders) {
    try {
      const commission = await createCommission(order.id);
      if (commission) repaired.push(order.orderNumber);
    } catch (error) {
      failures.push({
        orderNumber: order.orderNumber,
        error: error instanceof Error ? error.message : "Commission reconciliation failed",
      });
    }
  }

  return { checked: orders.length, repaired, failures };
}
