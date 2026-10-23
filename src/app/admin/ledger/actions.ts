"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

const updateSchema = schema.extend({ id: z.string().trim().min(1) });

async function convertedValues(input: z.infer<typeof schema>) {
  const conversion = await getCadExchangeRate(input.currency, input.transactionAt);
  const toCad = (amount: number) => Math.round(amount * conversion.rate * 100) / 100;
  return {
    amount: toCad(input.amount),
    taxAmount: toCad(input.taxAmount),
    shippingAmount: toCad(input.shippingAmount),
    foreignAmount: input.amount,
    fxRate: conversion.rate,
    fxRateDate: conversion.rateDate,
    fxRateSource: conversion.source,
  };
}

export async function addLedgerEntry(formData: FormData) {
  const session = await requireAdmin();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const input = schema.parse(Object.fromEntries(formData));
  const conversion = await convertedValues(input);
  await db.ledgerEntry.create({ data: { ...input, ...conversion, createdBy: session.user.id } });
  await db.auditLog.create({ data: { userId: session.user.id, action: "CREATE_LEDGER_ENTRY", entity: "LedgerEntry", details: JSON.stringify(input) } });
  revalidatePath("/admin/ledger");
}

export async function updateLedgerEntry(formData: FormData) {
  const session = await requireAdmin();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const raw = Object.fromEntries(formData);
  const { id, ...input } = updateSchema.parse(raw);
  const existing = await db.ledgerEntry.findUnique({ where: { id } });
  if (!existing) throw new Error("Ledger entry not found");
  const conversion = await convertedValues(input);
  await db.ledgerEntry.update({ where: { id }, data: { ...input, ...conversion } });
  await db.auditLog.create({ data: { userId: session.user.id, action: "UPDATE_LEDGER_ENTRY", entity: "LedgerEntry", entityId: id, details: JSON.stringify({ before: existing, after: input }) } });
  revalidatePath("/admin/ledger");
  const from = typeof raw.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.from) ? raw.from : "";
  const to = typeof raw.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.to) ? raw.to : "";
  const range = from && to ? `&from=${from}&to=${to}` : "";
  redirect(`/admin/ledger?updated=1${range}`);
}

const donationSchema = z.object({
  payoutDate: z.coerce.date(),
  charityName: z.string().trim().min(1).max(160),
  amount: z.coerce.number().positive().max(1_000_000_000),
});

export async function addDonationPayout(formData: FormData) {
  const session = await requireAdmin();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const input = donationSchema.parse(Object.fromEntries(formData));
  const amount = Math.round(input.amount * 100) / 100;
  await db.ledgerEntry.create({
    data: {
      transactionAt: input.payoutDate,
      entryType: "EXPENSE",
      category: "Charitable Donations",
      description: `Donation to ${input.charityName}`,
      amount,
      currency: "CAD",
      foreignAmount: amount,
      fxRate: 1,
      fxRateDate: input.payoutDate,
      fxRateSource: "CAD",
      taxAmount: 0,
      shippingAmount: 0,
      paymentMethod: "Donation payout",
      createdBy: session.user.id,
    },
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE_CHARITY_DONATION",
      entity: "LedgerEntry",
      details: JSON.stringify({ ...input, amount, category: "Charitable Donations" }),
    },
  });
  revalidatePath("/admin/ledger");
}
