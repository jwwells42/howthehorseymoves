"use client";

import Link from "next/link";
import SetupTrainer from "@/components/board/SetupTrainer";

export default function SetupPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link
        href="/"
        className="text-sm text-muted hover:text-foreground mb-4 inline-block"
      >
        &larr; Back to home
      </Link>
      <SetupTrainer />
    </main>
  );
}
