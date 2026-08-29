import { db } from "@/lib/db";
import { buildEmailTemplate, sendEmail } from "@/lib/emails";
import {
  evaluateAffiliateMonth,
  reconcileAllAffiliateMinimums,
} from "@/lib/affiliate";
import {
  getAffiliateCommissionRate,
  getPeriodBounds,
  getUtcMonthBounds,
  roundMoney,
} from "@/lib/affiliate-program";

const PAID_STATUSES = [
  "PAYMENT_RECEIVED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
] as const;

export async function getDashboardMetrics() {
  const paidOrdersWhere = { status: { in: [...PAID_STATUSES] } };

  const [
    revenueAgg,
    totalOrders,
    awaitingPayment,
    paidOrdersCount,
    topProducts,
    affiliateOrderAgg,
    outstandingCommissionAgg,
  ] = await Promise.all([
    db.order.aggregate({
      where: paidOrdersWhere,
      _sum: { total: true },
    }),
    db.order.count(),
    db.order.count({ where: { status: "AWAITING_PAYMENT" } }),
    db.order.count({ where: paidOrdersWhere }),
    db.orderItem.groupBy({
      by: ["productId", "productName"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
    }),
    db.order.aggregate({
      where: { affiliateId: { not: null }, ...paidOrdersWhere },
      _sum: { total: true },
    }),
    db.affiliateCommission.aggregate({
      where: { status: { in: ["PENDING", "APPROVED", "LOCKED"] } },
      _sum: { commissionAmount: true },
    }),
  ]);

  const revenue = revenueAgg._sum.total ?? 0;
  const affiliateRevenue = affiliateOrderAgg._sum.total ?? 0;
  const outstandingCommission = outstandingCommissionAgg._sum.commissionAmount ?? 0;
  const aov = paidOrdersCount > 0 ? revenue / paidOrdersCount : 0;

  return {
    revenue,
    totalOrders,
    awaitingPayment,
    paidOrders: paidOrdersCount,
    aov,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      quantity: p._sum.quantity ?? 0,
      revenue: p._sum.totalPrice ?? 0,
    })),
    affiliateRevenue,
    outstandingCommission,
  };
}

export async function approveAffiliateApplication(
  applicationId: string,
  reviewedBy: string
) {
  const application = await db.affiliateApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== "PENDING") {
    throw new Error("Application has already been reviewed");
  }

  let userId = application.userId;

  if (!userId) {
    const existingUser = await db.user.findUnique({
      where: { email: application.email.trim().toLowerCase() },
    });
    userId = existingUser?.id ?? null;
  }

  if (!userId) {
    throw new Error(
      "No user account found for this email. Applicant must register first."
    );
  }

  const existingAccount = await db.affiliateAccount.findUnique({
    where: { userId },
  });

  if (existingAccount) {
    throw new Error("User already has an affiliate account");
  }

  const commissionRate = 10;

  await db.$transaction(async (tx) => {
    await tx.affiliateApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy,
        userId,
      },
    });

    await tx.user.update({
      where: { id: userId! },
      data: { role: "AFFILIATE" },
    });

    await tx.affiliateAccount.create({
      data: {
        userId: userId!,
        code: `PENDING-${userId!}`,
        commissionRate,
        status: "ACTIVE",
        minimumTrackingStartedAt: new Date(),
      },
    });
  });

  try {
    await sendEmail(
      application.email,
      await buildEmailTemplate("affiliate_approved", {
        name: application.name,
        affiliateUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ovipeps.ca"}/account/affiliate`,
      })
    );
  } catch (error) {
    console.error("Affiliate approval email failed", error);
  }

  return { code: null };
}

export async function rejectAffiliateApplication(
  applicationId: string,
  reviewedBy: string,
  reviewNotes?: string
) {
  const application = await db.affiliateApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== "PENDING") {
    throw new Error("Application has already been reviewed");
  }

  return db.affiliateApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedBy,
      reviewNotes: reviewNotes?.trim() || undefined,
    },
  });
}

export async function generateMonthlyPayout(year: number, month: number) {
  if (month < 1 || month > 12) {
    throw new Error("Invalid month");
  }

  const { start, end } = getPeriodBounds(year, month);
  if (end > getUtcMonthBounds(new Date()).start) {
    throw new Error("Monthly reports can only be generated after the month has ended");
  }

  const existing = await db.affiliatePayout.findUnique({
    where: {
      periodYear_periodMonth: { periodYear: year, periodMonth: month },
    },
  });

  if (existing) {
    throw new Error(`Payout for ${month}/${year} already exists`);
  }

  await reconcileAllAffiliateMinimums();
  const trackedAffiliates = await db.affiliateAccount.findMany({
    where: { status: "ACTIVE", minimumTrackingStartedAt: { lt: end } },
    select: { id: true },
  });
  for (const affiliate of trackedAffiliates) {
    await evaluateAffiliateMonth(affiliate.id, year, month);
  }

  const commissions = await db.affiliateCommission.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      payoutItem: null,
      createdAt: { gte: start, lt: end },
    },
    include: { affiliate: true },
  });

  if (commissions.length === 0) {
    throw new Error("No eligible commissions found for this period");
  }

  const byAffiliate = new Map<
    string,
    {
      affiliateId: string;
      commissions: typeof commissions;
      grossSales: number;
      commissionRate: number;
      commissionOwed: number;
      previousCommissionOwed: number;
    }
  >();

  for (const commission of commissions) {
    const entry = byAffiliate.get(commission.affiliateId) ?? {
      affiliateId: commission.affiliateId,
      commissions: [],
      grossSales: 0,
      commissionRate: 10,
      commissionOwed: 0,
      previousCommissionOwed: 0,
    };
    entry.commissions.push(commission);
    entry.grossSales += commission.commissionableAmount;
    entry.previousCommissionOwed += commission.commissionAmount;
    byAffiliate.set(commission.affiliateId, entry);
  }

  for (const entry of byAffiliate.values()) {
    entry.grossSales = roundMoney(entry.grossSales);
    entry.commissionRate = getAffiliateCommissionRate(entry.grossSales);
    entry.commissionOwed = roundMoney(
      entry.commissions.reduce(
        (sum, commission) =>
          sum + roundMoney(commission.commissionableAmount * (entry.commissionRate / 100)),
        0
      )
    );
  }

  const totalAmount = roundMoney(
    [...byAffiliate.values()].reduce((sum, a) => sum + a.commissionOwed, 0)
  );

  const payout = await db.$transaction(async (tx) => {
    const created = await tx.affiliatePayout.create({
      data: {
        periodYear: year,
        periodMonth: month,
        status: "DRAFT",
        totalAmount,
      },
    });

    for (const entry of byAffiliate.values()) {
      for (const commission of entry.commissions) {
        await tx.affiliateCommission.update({
          where: { id: commission.id },
          data: {
            commissionRate: entry.commissionRate,
            commissionAmount: roundMoney(
              commission.commissionableAmount * (entry.commissionRate / 100)
            ),
          },
        });
      }

      await tx.affiliatePayoutItem.create({
        data: {
          payoutId: created.id,
          affiliateId: entry.affiliateId,
          commissionIds: entry.commissions.map((commission) => commission.id),
          grossSales: entry.grossSales,
          commissionRate: entry.commissionRate,
          commissionOwed: entry.commissionOwed,
          status: "DRAFT",
        },
      });

      await tx.affiliateCommission.updateMany({
        where: { id: { in: entry.commissions.map((commission) => commission.id) } },
        data: { status: "LOCKED", lockedAt: new Date() },
      });

      const earningsDelta = roundMoney(
        entry.commissionOwed - entry.previousCommissionOwed
      );
      await tx.affiliateAccount.update({
        where: { id: entry.affiliateId },
        data: {
          commissionRate: entry.commissionRate,
          totalEarnings: { increment: earningsDelta },
          pendingEarnings: { increment: earningsDelta },
        },
      });
      await tx.affiliateMonthlyPerformance.updateMany({
        where: {
          affiliateId: entry.affiliateId,
          periodYear: year,
          periodMonth: month,
        },
        data: {
          qualifyingSales: entry.grossSales,
          commissionRate: entry.commissionRate,
          commissionOwed: entry.commissionOwed,
        },
      });
    }

    return created;
  });

  return payout;
}

export async function markPayoutItemPaid(
  payoutItemId: string,
  options: {
    paymentMethod: "E_TRANSFER" | "CRYPTO";
    paymentAmount: number;
    paidBy: string;
    paidAt: Date;
    paymentReference?: string;
  }
) {
  const item = await db.affiliatePayoutItem.findUnique({
    where: { id: payoutItemId },
  });

  if (!item) {
    throw new Error("Payout item not found");
  }

  if (item.status === "PAID") {
    throw new Error("Payout item is already marked as paid");
  }

  const commissionIds = Array.isArray(item.commissionIds)
    ? item.commissionIds.filter((id): id is string => typeof id === "string")
    : item.commissionId
      ? [item.commissionId]
      : [];

  await db.$transaction(async (tx) => {
    await tx.affiliatePayoutItem.update({
      where: { id: payoutItemId },
      data: {
        status: "PAID",
        paidAt: options.paidAt,
        paymentReference: options.paymentReference?.trim() || undefined,
        paymentMethod: options.paymentMethod,
        paymentAmount: options.paymentAmount,
        paidBy: options.paidBy.trim(),
      },
    });

    if (commissionIds.length) {
      await tx.affiliateCommission.updateMany({
        where: { id: { in: commissionIds } },
        data: {
          status: "PAID",
          paidAt: options.paidAt,
        },
      });

      await tx.affiliateAccount.update({
        where: { id: item.affiliateId },
        data: {
          pendingEarnings: { decrement: item.commissionOwed },
          paidEarnings: { increment: options.paymentAmount },
        },
      });
    }

    const remaining = await tx.affiliatePayoutItem.count({
      where: { payoutId: item.payoutId, id: { not: item.id }, status: { not: "PAID" } },
    });
    if (remaining === 0) {
      await tx.affiliatePayout.update({
        where: { id: item.payoutId },
        data: { status: "PAID", processedAt: options.paidAt, processedBy: options.paidBy.trim() },
      });
    }
  });

  return item;
}
