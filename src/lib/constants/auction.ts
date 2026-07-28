export const MAX_PLAYERS_PER_TEAM = 4;
export const MIN_BID = 1000;
export const MAX_BID = 6000;

/** Tier C is auctioned first, then Tier B. Tier A is lottery-only. */
export const TIER_AUCTION_ORDER = ["C", "B"] as const;

/** Each team ends up with 1 Tier C player and 2 Tier B players (plus 1 Tier A via lottery). */
export const MAX_PER_TEAM_BY_TIER: Record<(typeof TIER_AUCTION_ORDER)[number], number> = {
  C: 1,
  B: 2,
};
