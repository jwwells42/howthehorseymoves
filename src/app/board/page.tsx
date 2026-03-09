"use client";

import Link from "next/link";
import CoordinateTrainer from "@/components/board/CoordinateTrainer";

export default function BoardPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back to home
      </Link>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-1">Coordinates</h1>
      </div>
      <CoordinateTrainer />
    </main>
  );
}
