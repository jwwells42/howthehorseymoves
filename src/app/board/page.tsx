"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StarRating from "@/components/puzzle/StarRating";

export default function BoardPage() {
  const [coordStars, setCoordStars] = useState(0);

  useEffect(() => {
    setCoordStars(parseInt(localStorage.getItem("coord-best-stars") ?? "0", 10));
  }, []);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back to home
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded bg-[#7a9e6e] border-2 border-[#d4c4a0] flex items-center justify-center text-2xl font-bold text-[#d4c4a0]">
          e4
        </div>
        <div>
          <h1 className="text-3xl font-bold">The Board</h1>
          <p className="text-muted">Learn the board and set up the pieces.</p>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/board/coordinates"
          className="flex items-center justify-between p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-[#7a9e6e] border-2 border-[#d4c4a0] flex items-center justify-center text-sm font-bold text-[#d4c4a0]">
              e4
            </div>
            <div>
              <h3 className="font-bold">Name the Square</h3>
              <p className="text-sm text-muted">Click the right square before time runs out!</p>
            </div>
          </div>
          <div className="text-right">
            {coordStars > 0 && <StarRating stars={coordStars} size="sm" />}
          </div>
        </Link>

        <Link
          href="/setup"
          className="flex items-center justify-between p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pieces/wK.svg" alt="Setup" className="w-6 h-6 -mr-0.5" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pieces/wQ.svg" alt="Setup" className="w-6 h-6 -ml-0.5" />
            </div>
            <div>
              <h3 className="font-bold">Place the Pieces</h3>
              <p className="text-sm text-muted">Put each piece on its starting square.</p>
            </div>
          </div>
          <span className="text-xs text-faint">7 stages</span>
        </Link>
      </div>
    </main>
  );
}
