"use client";

import Link from "next/link";
import PieceCard from "@/components/progress/PieceCard";
import { PIECES, CATEGORIES, getPuzzlesForPiece } from "@/lib/puzzles";
import { useProgress } from "@/lib/state/progress-context";

export default function Home() {
  const { state, getPuzzleProgress } = useProgress();

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">How The Horsey Moves</h1>
        <p className="text-muted">
          Learn how each chess piece moves through interactive puzzles
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PIECES.map((piece) => {
          const puzzleSet = getPuzzlesForPiece(piece.key);
          const totalPuzzles = puzzleSet?.puzzles.length ?? 0;
          let completedPuzzles = 0;
          let bestStars = 0;

          if (puzzleSet && state.loaded) {
            for (const p of puzzleSet.puzzles) {
              const progress = getPuzzleProgress(p.id);
              if (progress?.completed) {
                completedPuzzles++;
                bestStars = Math.max(bestStars, progress.bestStars);
              }
            }
          }

          return (
            <PieceCard
              key={piece.key}
              pieceKey={piece.key}
              name={piece.name}
              description={piece.description}
              iconPath={piece.icon}
              totalPuzzles={totalPuzzles}
              completedPuzzles={completedPuzzles}
              bestStars={bestStars}
              locked={!piece.available}
            />
          );
        })}

        {/* Category cards */}
        {CATEGORIES.map((cat) => {
          let totalPuzzles = 0;
          let completedPuzzles = 0;

          if (state.loaded) {
            for (const sub of cat.subcategories) {
              const puzzleSet = getPuzzlesForPiece(sub.key);
              if (puzzleSet) {
                totalPuzzles += puzzleSet.puzzles.length;
                for (const p of puzzleSet.puzzles) {
                  const progress = getPuzzleProgress(p.id);
                  if (progress?.completed) completedPuzzles++;
                }
              }
            }
          }

          return (
            <Link key={cat.key} href={`/learn/${cat.key}`}>
              <div className="rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg cursor-pointer p-6 transition-all h-full flex flex-col">
                <div className="flex items-center gap-4 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.icon} alt={cat.name} className="w-12 h-12" />
                  <h3 className="text-lg font-bold">{cat.name}</h3>
                </div>
                <p className="text-sm text-muted mb-3 flex-1">{cat.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-faint">
                    {completedPuzzles}/{totalPuzzles} puzzles
                  </span>
                  <span className="text-xs text-faint">
                    {cat.subcategories.length} patterns
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Play card */}
        <Link href="/play">
          <div className="rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg cursor-pointer p-6 transition-all h-full flex flex-col">
            <div className="flex items-center gap-4 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pieces/wK.svg" alt="Play" className="w-12 h-12" />
              <h3 className="text-lg font-bold">Play vs Computer</h3>
            </div>
            <p className="text-sm text-muted mb-3 flex-1">
              Practice everything you&apos;ve learned in a full game!
            </p>
            <div className="text-xs text-faint">&nbsp;</div>
          </div>
        </Link>
      </div>
    </main>
  );
}
