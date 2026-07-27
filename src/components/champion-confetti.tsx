"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export function ChampionConfetti({ championName }: { championName: string | null }) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!championName || firedFor.current === championName) return;
    firedFor.current = championName;

    confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#6c3baa", "#d9a514", "#7c3aed", "#fbcf4f"],
    });
  }, [championName]);

  return null;
}
