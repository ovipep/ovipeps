import type { CommissionStatus } from "@/generated/prisma/enums";

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  LOCKED: "Locked",
  PAID: "Paid",
  REVERSED: "Reversed",
};

export interface AffiliateDashboardData {
  account: {
    id: string;
    code: string;
    commissionRate: number;
    status: string;
    totalClicks: number;
    totalOrders: number;
    totalEarnings: number;
    paidEarnings: number;
    pendingEarnings: number;
    payoutEmail: string | null;
    missedMinimumMonths: number;
    frozenAt: string | null;
  };
  currentMonth: {
    qualifyingSales: number;
    commissionRate: number;
    minimumMet: boolean;
    amountToMinimum: number;
    nextTierThreshold: number | null;
    nextTierRate: number | null;
    amountToNextTier: number;
    periodLabel: string;
    updatedAt: string;
  };
  conversionRate: number;
  commissionByStatus: Partial<Record<CommissionStatus, number>>;
  clickChart: { date: string; value: number }[];
  commissionChart: { date: string; value: number }[];
  clicks: {
    id: string;
    referrer: string | null;
    landingPage: string | null;
    createdAt: string;
  }[];
  attributions: {
    id: string;
    code: string;
    converted: boolean;
    expiresAt: string;
    createdAt: string;
  }[];
  commissions: {
    id: string;
    orderNumber: string;
    orderAmount: number;
    commissionableAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: CommissionStatus;
    flagged: boolean;
    flagReason: string | null;
    createdAt: string;
  }[];
  payouts: {
    id: string;
    periodMonth: number;
    periodYear: number;
    grossSales: number;
    commissionOwed: number;
    paymentAmount: number | null;
    paymentMethod: string | null;
    paymentReference: string | null;
    runningPaidTotal: number | null;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }[];
}
