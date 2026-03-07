"use client";

import PieceCard from "@/components/progress/PieceCard";
import { PIECES, getPuzzlesForPiece } from "@/lib/puzzles";
import { useProgress } from "@/lib/state/progress-context";

export default function Home() {
  const { state, getPuzzleProgress } = useProgress();

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">How The Horsey Moves</h1>
        <p className="text-gray-500 dark:text-gray-400">
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
      </div>
    </main>
  );
}
