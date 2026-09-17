"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
const schema = z.object({
  transactionAt: z.coerce.date(), entryType: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1).max(80), description: z.string().trim().min(1).max(240),
  amount: z.coerce.number().min(0), taxAmount: z.coerce.number().min(0).default(0),
  shippingAmount: z.coerce.number().min(0).default(0), paymentMethod: z.string().trim().max(80).optional(),
  reference: z.string().trim().max(100).optional(), notes: z.string().trim().max(500).optional(),
});
export async function addLedgerEntry(formData: FormData) {
  const session = await requireAdmin();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const input = schema.parse(Object.fromEntries(formData));
  await db.ledgerEntry.create({ data: { ...input, createdBy: session.user.id } });
  await db.auditLog.create({ data: { userId: session.user.id, action: "CREATE_LEDGER_ENTRY", entity: "LedgerEntry", details: JSON.stringify(input) } });
  revalidatePath("/admin/ledger");
}
