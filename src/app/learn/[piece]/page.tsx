"use client";

import { use } from "react";
import Link from "next/link";
import { getPuzzlesForPiece, PIECES } from "@/lib/puzzles";
import { useProgress } from "@/lib/state/progress-context";
import StarRating from "@/components/puzzle/StarRating";

export default function PieceLearnPage({
  params,
}: {
  params: Promise<{ piece: string }>;
}) {
  const { piece } = use(params);
  const puzzleSet = getPuzzlesForPiece(piece);
  const pieceInfo = PIECES.find((p) => p.key === piece);
  const { state, isPuzzleUnlocked, getPuzzleProgress } = useProgress();

  if (!puzzleSet || !pieceInfo) {
    return (
      <main className="min-h-screen p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Piece not found</h1>
        <Link href="/" className="text-blue-500 hover:underline">Back to home</Link>
      </main>
    );
  }

  const puzzleIds = puzzleSet.puzzles.map((p) => p.id);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 inline-block">
        &larr; Back to pieces
      </Link>

      <div className="flex items-center gap-4 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pieceInfo.icon} alt={pieceInfo.name} className="w-16 h-16" />
        <div>
          <h1 className="text-3xl font-bold">{pieceInfo.name} Puzzles</h1>
          <p className="text-gray-500 dark:text-gray-400">{pieceInfo.description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {puzzleSet.puzzles.map((puzzle, idx) => {
          const unlocked = state.loaded && isPuzzleUnlocked(puzzle.id, puzzleIds);
          const progress = getPuzzleProgress(puzzle.id);

          return (
            <div key={puzzle.id}>
              {unlocked ? (
                <Link
                  href={`/learn/${piece}/${puzzle.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-6 text-right">{idx + 1}.</span>
                    <div>
                      <span className="font-medium">{puzzle.title}</span>
                      <p className="text-xs text-gray-400">{puzzle.instruction}</p>
                    </div>
                  </div>
                  {progress?.completed && (
                    <StarRating stars={progress.bestStars} size="sm" />
                  )}
                </Link>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-800 opacity-40">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-6 text-right">{idx + 1}.</span>
                    <span className="font-medium">{puzzle.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">Locked</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
