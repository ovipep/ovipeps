import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAffiliate } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveAffiliatePayoutEmail } from "@/lib/affiliate-payout-email";

export async function POST(request: Request) {
  const session = await requireAffiliate();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payoutEmail = await saveAffiliatePayoutEmail(db, session.user.id, await request.json());
    return NextResponse.json({ success: true, payoutEmail });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Enter a valid email address." }, { status: 400 });
    console.error("Affiliate payout email save failed", error);
    return NextResponse.json({ error: "We could not save your payout email. Please try again." }, { status: 400 });
  }
}
