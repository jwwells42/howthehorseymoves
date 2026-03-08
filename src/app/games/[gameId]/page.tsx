"use client";

import { use } from "react";
import Link from "next/link";
import { getGame } from "@/lib/games";
import GameViewer from "@/components/game/GameViewer";

export default function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const game = getGame(gameId);

  if (!game) {
    return (
      <main className="min-h-screen p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Game not found</h1>
        <Link href="/games" className="text-muted hover:underline">Back to games</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4">
      <Link
        href="/games"
        className="text-sm text-muted hover:text-foreground mb-4 inline-block ml-4"
      >
        &larr; Back to games
      </Link>
      <GameViewer game={game} />
    </main>
  );
}
