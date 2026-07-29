import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MAX_PLAYERS, MAX_PLAYERS_PER_TIER } from "@/lib/validations/player";
import { OWNER_COUNT } from "@/lib/validations/owner";
import {
  MAX_BID,
  MAX_PLAYERS_PER_TEAM,
  MIN_BID,
} from "@/lib/constants/auction";
import { GAME_WINNING_SCORE } from "@/lib/validations/match";

const AUCTION_PLAYERS = MAX_PLAYERS - MAX_PLAYERS_PER_TIER;
const AUCTIONED_PER_TEAM = MAX_PLAYERS_PER_TEAM - 1;
// Mirrors DEFAULT_STARTING_BUDGET in lib/actions/owners.ts — can't import it
// directly since "use server" files may only export async functions.
const STARTING_BUDGET = 10000;

export default function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Rules</h1>
        <p className="text-sm text-muted-foreground">
          How teams, allocation, the auction, and matches work in FoosKonnekt.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teams &amp; roster</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              There are {OWNER_COUNT} teams, each ending up with exactly{" "}
              {MAX_PLAYERS_PER_TEAM} players ({MAX_PLAYERS} players total).
            </p>
            <p>
              {MAX_PLAYERS_PER_TIER} players are <strong>allocated</strong> by
              lottery, one per team, free of charge.
            </p>
            <p>
              The remaining {AUCTION_PLAYERS} players are{" "}
              <strong>auctioned</strong>, so each team buys{" "}
              {AUCTIONED_PER_TEAM} more players to reach {MAX_PLAYERS_PER_TEAM}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allocation lottery</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Once all {MAX_PLAYERS_PER_TIER} allocated players are marked in
              the Players page, the lottery randomly assigns each of them to
              one team.
            </p>
            <p>This is free — it doesn&apos;t touch any team&apos;s budget.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auction</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Each team starts with a budget of {STARTING_BUDGET.toLocaleString()}.
            </p>
            <p>
              The {AUCTION_PLAYERS} auctioned players come up one at a time in
              random order. Admins can reshuffle the remaining order at any
              point with the &quot;Randomize pool&quot; button.
            </p>
            <p>
              Bids must be between {MIN_BID.toLocaleString()} and{" "}
              {MAX_BID.toLocaleString()}. A team can&apos;t bid more than its
              remaining budget, and can&apos;t buy more than{" "}
              {MAX_PLAYERS_PER_TEAM} players total.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">League matches</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Every league matchup between two teams is played as 3 games (2v2
              foosball). Games are played to {GAME_WINNING_SCORE} — first side
              to reach {GAME_WINNING_SCORE} wins the game.
            </p>
            <p>
              Across the 3 games, each team must field exactly 4 distinct
              players, with 2 players playing 2 games each and the other 2
              playing 1 game each (a 2-2-1-1 split).
            </p>
            <p>
              A team earns league points equal to the number of games it wins
              in that matchup (0 to 3 points).
            </p>
            <p>
              Standings are ranked by total league points. If two or more
              teams are tied on points, they're resolved in this order:
            </p>
            <ol className="list-decimal pl-5">
              <li>
                Points from just the matches played among the tied teams (a
                head-to-head mini-league). With 3+ teams tied, this can still
                come out even — e.g. a cycle where A beat B, B beat C, and C
                beat A.
              </li>
              <li>
                Game difference across the whole league stage (games won
                minus games lost), not just games against the tied teams.
              </li>
              <li>
                Goal difference across the whole league stage (goals scored
                minus goals conceded).
              </li>
              <li>Goals scored across the whole league stage (total goals for).</li>
            </ol>
            <p>
              If teams are still tied after all four steps, they stay level in
              the standings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Playoffs</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              <strong>Qualifier:</strong> best-of-3, first team to 2 game wins
              takes the series. Player participation follows a 2-2-1-1 split
              across the series — 2 players play up to 2 games each, and the
              other 2 play up to 1 game each.
            </p>
            <p>
              <strong>Grand Final:</strong> best-of-5, first team to 3 game
              wins takes the series. Participation follows a 3-3-2-2 split —
              2 players play up to 3 games each, and the other 2 play up to 2
              games each.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              <strong>Admin</strong> accounts can edit players/owners, run the
              lottery, bid and sell in the auction, and record match results.
            </p>
            <p>
              <strong>Read-only</strong> accounts can view every page but
              can&apos;t make any changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
