"use client";

import Link from "next/link";
import { GAMES } from "@/lib/games";

export default function GamesPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back to home
      </Link>

      <h1 className="text-3xl font-bold mb-2">Model Games</h1>
      <p className="text-muted mb-6">
        Study famous games move by move.
      </p>

      <div className="space-y-3">
        {GAMES.map(game => (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className="flex items-center justify-between p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all"
          >
            <div>
              <h3 className="font-bold">
                {game.white} vs {game.black}
              </h3>
              <p className="text-sm text-muted">{game.event}, {game.year}</p>
            </div>
            <span className="text-sm text-faint">{game.result}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
