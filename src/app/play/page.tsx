"use client";

import Link from "next/link";
import GameShell from "@/components/game/GameShell";

export default function PlayPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back to home
      </Link>
      <GameShell />
    </main>
  );
}
