"use client";

import Link from "next/link";

const SUBCATEGORIES = [
  {
    key: "coordinates",
    name: "Coordinates",
    description: "Click the named square as fast as you can!",
    icon: "&#9638;",
  },
];

export default function BoardPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back to home
      </Link>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">The Board</h1>
        <p className="text-muted">Learn the chessboard inside and out</p>
      </div>
      <div className="space-y-3 max-w-md mx-auto">
        {SUBCATEGORIES.map((sub) => (
          <Link key={sub.key} href={`/board/${sub.key}`}>
            <div className="p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all">
              <h3 className="font-bold mb-1">{sub.name}</h3>
              <p className="text-sm text-muted">{sub.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
