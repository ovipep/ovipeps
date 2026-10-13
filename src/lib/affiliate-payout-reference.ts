/**
 * One permanent reference per payout item. The complete, case-sensitive database
 * primary key makes this mapping unique without random retries or truncation.
 * Existing payouts receive the same reference without rewriting bank references.
 */
export function getAffiliatePayoutReference(payoutItemId: string) {
  if (!payoutItemId) throw new Error("A payout record ID is required.");
  return `OVI-PAYOUT-${payoutItemId}`;
}
