"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCadExchangeRate } from "@/lib/exchange-rates";
const schema = z.object({
  transactionAt: z.coerce.date(), entryType: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1).max(80), description: z.string().trim().min(1).max(240),
  amount: z.coerce.number().min(0), currency: z.enum(["CAD", "USD"]), taxAmount: z.coerce.number().min(0).default(0),
  shippingAmount: z.coerce.number().min(0).default(0), paymentMethod: z.string().trim().max(80).optional(),
  reference: z.string().trim().max(100).optional(), notes: z.string().trim().max(500).optional(),
});
export async function addLedgerEntry(formData: FormData) {
  const session = await requireAdmin();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const input = schema.parse(Object.fromEntries(formData));
  const conversion = await getCadExchangeRate(input.currency, input.transactionAt);
  const cadAmount = Math.round(input.amount * conversion.rate * 100) / 100;
  await db.ledgerEntry.create({ data: { ...input, amount: cadAmount, foreignAmount: input.amount, fxRate: conversion.rate, fxRateDate: conversion.rateDate, fxRateSource: conversion.source, createdBy: session.user.id } });
  await db.auditLog.create({ data: { userId: session.user.id, action: "CREATE_LEDGER_ENTRY", entity: "LedgerEntry", details: JSON.stringify(input) } });
  revalidatePath("/admin/ledger");
}
