"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gavel, Shuffle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reshufflePool, sellPlayer } from "@/lib/actions/auction";
import {
  MAX_BID,
  MAX_PER_TEAM_BY_TIER,
  MAX_PLAYERS_PER_TEAM,
  MIN_BID,
} from "@/lib/constants/auction";

type Team = {
  id: string;
  name: string;
  ownerName: string;
  remainingBudget: number;
  players: { id: string; name: string; auctionPrice: number | null; tier: string | null }[];
};

type UnsoldPlayer = {
  id: string;
  name: string;
  tier: string | null;
};

export function AuctionBoard({
  teams,
  unsoldPlayers,
  currentTier,
  isAdmin,
}: {
  teams: Team[];
  unsoldPlayers: UnsoldPlayer[];
  currentTier: string | null;
  isAdmin: boolean;
}) {
  const currentPlayer = unsoldPlayers[0] ?? null;

  const [bidTeamId, setBidTeamId] = useState<string>("");
  const [bidAmount, setBidAmount] = useState<string>("");
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidderTeamId, setHighestBidderTeamId] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentBid(0);
    setHighestBidderTeamId(null);
    setBidTeamId("");
    setBidAmount("");
  }, [currentPlayer?.id]);

  const highestBidderTeam = teams.find((t) => t.id === highestBidderTeamId);

  function tierCapFor(team: Team) {
    if (!currentPlayer?.tier) return null;
    const cap =
      MAX_PER_TEAM_BY_TIER[currentPlayer.tier as keyof typeof MAX_PER_TEAM_BY_TIER];
    if (!cap) return null;
    const held = team.players.filter((p) => p.tier === currentPlayer.tier).length;
    return { cap, held };
  }

  function handleIncreaseBid() {
    const amount = Number(bidAmount);
    if (!bidTeamId) {
      toast.error("Select a team first");
      return;
    }
    if (!Number.isFinite(amount) || amount <= currentBid) {
      toast.error(`Bid must be higher than the current bid of ${currentBid}`);
      return;
    }
    if (amount < MIN_BID || amount > MAX_BID) {
      toast.error(`Bid must be between ${MIN_BID} and ${MAX_BID}`);
      return;
    }
    const team = teams.find((t) => t.id === bidTeamId);
    if (!team) return;
    if (team.players.length >= MAX_PLAYERS_PER_TEAM) {
      toast.error(`${team.name} already has ${MAX_PLAYERS_PER_TEAM} players`);
      return;
    }
    const tierCap = tierCapFor(team);
    if (tierCap && tierCap.held >= tierCap.cap) {
      toast.error(`${team.name} already has ${tierCap.cap} Tier ${currentPlayer?.tier} player(s)`);
      return;
    }
    if (amount > team.remainingBudget) {
      toast.error(`${team.name} does not have enough budget`);
      return;
    }
    setCurrentBid(amount);
    setHighestBidderTeamId(team.id);
    setBidAmount("");
  }

  async function handleSell() {
    if (!currentPlayer || !highestBidderTeamId) return;
    setSubmitting(true);
    const result = await sellPlayer(currentPlayer.id, highestBidderTeamId, currentBid);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${currentPlayer.name} sold for ${currentBid}`);
  }

  async function handleReshuffle() {
    setSubmitting(true);
    const result = await reshufflePool();
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Remaining pool reshuffled");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{currentPlayer ? "Current player" : "Auction complete"}</span>
            {currentTier && <Badge variant="secondary">Tier {currentTier}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {currentPlayer ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-semibold">{currentPlayer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {unsoldPlayers.length} player(s) remaining in this tier
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReshuffle}
                    disabled={submitting}
                  >
                    <Shuffle /> Randomize tier
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Current bid
                  </span>
                  <span className="text-xl font-semibold">{currentBid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Highest bidder
                  </span>
                  {highestBidderTeam ? (
                    <Badge>{highestBidderTeam.name}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>

              {isAdmin && (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Label>Bidding team</Label>
                      <Select value={bidTeamId} onValueChange={setBidTeamId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => {
                            const isFull = team.players.length >= MAX_PLAYERS_PER_TEAM;
                            const tierCap = tierCapFor(team);
                            const tierFull = Boolean(tierCap && tierCap.held >= tierCap.cap);
                            return (
                              <SelectItem
                                key={team.id}
                                value={team.id}
                                disabled={isFull || tierFull}
                              >
                                {team.name} · {team.ownerName} (budget{" "}
                                {team.remainingBudget}, {team.players.length}/
                                {MAX_PLAYERS_PER_TEAM}
                                {tierCap ? `, ${tierCap.held}/${tierCap.cap} Tier ${currentPlayer.tier}` : ""})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Bid amount ({MIN_BID}-{MAX_BID})</Label>
                      <Input
                        type="number"
                        min={Math.max(MIN_BID, currentBid + 1)}
                        max={MAX_BID}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <Button variant="outline" onClick={handleIncreaseBid}>
                      <Gavel /> Increase bid
                    </Button>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={handleSell}
                      disabled={submitting || !highestBidderTeamId}
                    >
                      Sell player
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              All players have been sold. Teams are finalized below.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{team.name}</span>
                <Badge variant="secondary">{team.remainingBudget} left</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">{team.ownerName}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              {team.players.length === 0 && (
                <p className="text-xs text-muted-foreground">No players yet</p>
              )}
              {team.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {p.name}
                    {p.tier && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (Tier {p.tier})
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {p.auctionPrice}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
