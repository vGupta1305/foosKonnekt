"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StandingRow } from "@/lib/actions/standings";

export function StandingsChart({
  standings,
  className,
}: {
  standings: StandingRow[];
  className?: string;
}) {
  if (standings.length === 0) return null;

  const data = standings.map((row) => ({
    name: row.teamName,
    points: row.leaguePoints,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">League points by team</CardTitle>
      </CardHeader>
      <CardContent className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--popover-foreground)",
              }}
            />
            <Bar dataKey="points" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
