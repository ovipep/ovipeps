import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";

export const payoutEmailSchema = z.object({
  payoutEmail: z.string().trim().max(254).email("Enter a valid email address for receiving e-Transfers."),
}).strict();

export async function saveAffiliatePayoutEmail(
  client: Pick<PrismaClient, "affiliateAccount">,
  userId: string,
  input: unknown,
) {
  const { payoutEmail } = payoutEmailSchema.parse(input);
  // Derive ownership exclusively from the authenticated session, never payload IDs.
  const updated = await client.affiliateAccount.updateMany({
    where: { userId }, data: { payoutEmail },
  });
  if (updated.count !== 1) throw new Error("Affiliate account not found.");
  return payoutEmail;
}
