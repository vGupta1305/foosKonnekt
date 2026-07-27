import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StandingRow } from "@/lib/actions/standings";

export function StandingsTable({ standings }: { standings: StandingRow[] }) {
  if (standings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No teams yet. Standings will appear once fixtures are generated and
        matches are played.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>MP</TableHead>
            <TableHead>W</TableHead>
            <TableHead>L</TableHead>
            <TableHead>Pts</TableHead>
            <TableHead>GW</TableHead>
            <TableHead>GL</TableHead>
            <TableHead>GD</TableHead>
            <TableHead>Goals F</TableHead>
            <TableHead>Goals A</TableHead>
            <TableHead>Goal Diff</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((row, index) => (
            <TableRow key={row.teamId}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{row.teamName}</TableCell>
              <TableCell>{row.matchesPlayed}</TableCell>
              <TableCell>{row.wins}</TableCell>
              <TableCell>{row.losses}</TableCell>
              <TableCell className="font-semibold">{row.leaguePoints}</TableCell>
              <TableCell>{row.gamesWon}</TableCell>
              <TableCell>{row.gamesLost}</TableCell>
              <TableCell>{row.gameDifference}</TableCell>
              <TableCell>{row.goalsFor}</TableCell>
              <TableCell>{row.goalsAgainst}</TableCell>
              <TableCell>{row.goalDifference}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
