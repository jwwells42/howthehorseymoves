"use client";

import { use } from "react";
import Link from "next/link";
import OpeningTrainer from "@/components/opening/OpeningTrainer";
import { getOpening } from "@/lib/openings";

export default function OpeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const opening = getOpening(id);

  if (!opening) {
    return (
      <main className="min-h-screen p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Not found</h1>
        <Link href="/openings" className="text-muted hover:underline">Back to openings</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/openings" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
          &larr; Back to openings
        </Link>
      </div>
      <OpeningTrainer opening={opening} />
    </main>
  );
}
