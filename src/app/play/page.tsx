"use client";

import { useState } from "react";
import Link from "next/link";
import GameShell from "@/components/game/GameShell";
import type { BotLevel } from "@/lib/logic/bot";

export default function PlayPage() {
  const [level, setLevel] = useState<BotLevel | null>(null);

  if (!level) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
          &larr; Back to home
        </Link>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Play vs Computer</h1>
          <p className="text-muted">Choose your opponent</p>
        </div>
        <div className="space-y-3 max-w-sm mx-auto">
          <button
            onClick={() => setLevel("random")}
            className="w-full p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all text-left"
          >
            <h3 className="font-bold mb-1">Random Bot</h3>
            <p className="text-sm text-muted">Plays completely random legal moves. Great for beginners.</p>
          </button>
          <button
            onClick={() => setLevel("basic")}
            className="w-full p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all text-left"
          >
            <h3 className="font-bold mb-1">Basic Bot</h3>
            <p className="text-sm text-muted">Captures pieces, avoids blunders, and controls the center.</p>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <button
        onClick={() => setLevel(null)}
        className="text-sm text-muted hover:text-foreground mb-4 inline-block"
      >
        &larr; Change opponent
      </button>
      <GameShell key={level} botLevel={level} />
    </main>
  );
}
