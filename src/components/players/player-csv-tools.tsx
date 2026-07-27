"use client";

import { useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { importPlayersCsv } from "@/lib/actions/players";
import type { PlayerRow } from "@/components/players/player-form-dialog";

export function PlayerCsvTools({ players }: { players: PlayerRow[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const csv = Papa.unparse(
      players.map((p) => ({
        name: p.name,
        tier: p.tier ?? "",
        position: p.position ?? "",
        auctionPrice: p.auctionPrice ?? "",
        assignedTeam: p.teamName ?? "",
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "players.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const result = await importPlayersCsv(results.data);
        if (!result.ok) {
          toast.error(result.error);
        } else {
          toast.success(
            `Imported ${result.data.imported} player(s)` +
              (result.data.skipped > 0
                ? `, skipped ${result.data.skipped}`
                : ""),
          );
        }
      },
      error: () => toast.error("Could not parse CSV file"),
    });

    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button variant="outline" size="sm" onClick={handleImportClick}>
        <Upload /> Import CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download /> Export CSV
      </Button>
    </div>
  );
}
