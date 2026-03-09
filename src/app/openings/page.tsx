"use client";

import Link from "next/link";
import { OPENINGS } from "@/lib/openings";

export default function OpeningsPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back to home
      </Link>

      <h1 className="text-3xl font-bold mb-2">Opening Repertoire</h1>
      <p className="text-muted mb-8">Learn opening lines move by move.</p>

      <div className="space-y-3">
        {OPENINGS.map((opening) => (
          <Link
            key={opening.id}
            href={`/openings/${opening.id}`}
            className="flex items-center justify-between p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all block"
          >
            <div>
              <h3 className="font-bold">{opening.name}</h3>
              <p className="text-sm text-muted">{opening.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
