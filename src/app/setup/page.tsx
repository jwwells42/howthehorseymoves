"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StarRating from "@/components/puzzle/StarRating";
import { SETUP_STAGES } from "@/components/board/SetupTrainer";

export default function SetupListPage() {
  const [stageStars, setStageStars] = useState<Record<string, number>>({});

  useEffect(() => {
    const stars: Record<string, number> = {};
    for (const stage of SETUP_STAGES) {
      stars[stage.slug] = parseInt(
        localStorage.getItem(`setup-${stage.slug}-best-stars`) ?? "0",
        10
      );
    }
    setStageStars(stars);
  }, []);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link
        href="/"
        className="text-sm text-muted hover:text-foreground mb-4 inline-block"
      >
        &larr; Back to home
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pieces/wK.svg" alt="Setup" className="w-10 h-10 -mr-1" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pieces/wQ.svg" alt="Setup" className="w-10 h-10 -ml-1" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Place the Pieces</h1>
          <p className="text-muted">Put each piece on its starting square.</p>
        </div>
      </div>

      <div className="space-y-3">
        {SETUP_STAGES.map((stage, idx) => {
          const stars = stageStars[stage.slug] ?? 0;

          return (
            <Link
              key={stage.slug}
              href={`/setup/${stage.slug}`}
              className="flex items-center justify-between p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stage.icon}
                  alt={stage.label}
                  className="w-10 h-10"
                />
                <div>
                  <h3 className="font-bold">
                    {idx + 1}. {stage.label}
                  </h3>
                  <p className="text-sm text-muted">{stage.description}</p>
                </div>
              </div>
              <div className="text-right">
                {stars > 0 && <StarRating stars={stars} size="sm" />}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
