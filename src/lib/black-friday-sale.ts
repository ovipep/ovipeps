export const BLACK_FRIDAY_START_AT = new Date("2026-11-27T14:00:00.000Z");
export const BLACK_FRIDAY_END_AT = new Date("2026-11-28T04:50:00.000Z");

export type BlackFridayOffer = {
  state: "upcoming" | "active" | "ended";
  discountRate: 0 | 10 | 20;
  freeShipping: boolean;
};

export function getBlackFridayOffer(
  eligiblePeptideVials: number,
  isFirstTimeBuyer: boolean,
  now = new Date()
): BlackFridayOffer {
  if (now < BLACK_FRIDAY_START_AT) {
    return { state: "upcoming", discountRate: 0, freeShipping: false };
  }
  if (now >= BLACK_FRIDAY_END_AT) {
    return { state: "ended", discountRate: 0, freeShipping: false };
  }

  const discountRate: 0 | 10 | 20 =
    eligiblePeptideVials >= 10
      ? 20
      : eligiblePeptideVials > 0 && isFirstTimeBuyer
        ? 10
        : 0;

  return {
    state: "active",
    discountRate,
    freeShipping: eligiblePeptideVials >= 10,
  };
}
