export const MAX_PLAYERS_PER_TEAM = 4;
export const MIN_BID = 10;
export const MAX_BID = 60;

/** Auction order for tiers B-D. Tier A is drawn by lottery, never auctioned. */
export const TIER_AUCTION_ORDER = ["B", "C", "D"] as const;
