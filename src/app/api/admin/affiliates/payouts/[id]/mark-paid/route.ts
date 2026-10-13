import { getAffiliatePayoutReference } from "@/lib/affiliate-payout-reference";
import { NextResponse } from "next/server";
import { markPayoutItemPaid } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const paymentSchema = z.object({
  paymentMethod: z.enum(["E_TRANSFER", "CRYPTO"]),
  paymentAmount: z.number().positive(),
  paidBy: z.string().trim().min(2),
  paidAt: z.string().date(),
  paymentReference: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = paymentSchema.parse(await request.json());
    const paidItem = await markPayoutItemPaid(id, {
      paymentMethod: body.paymentMethod,
      paymentAmount: body.paymentAmount,
      paidBy: body.paidBy,
      paidAt: new Date(`${body.paidAt}T12:00:00.000Z`),
      paymentReference: body.paymentReference,
    });

    return NextResponse.json({ success: true, payoutReference: getAffiliatePayoutReference(paidItem.id) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark payout as paid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
