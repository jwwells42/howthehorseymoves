"use client";

import { use } from "react";
import Link from "next/link";
import { getPuzzlesForPiece, PIECES, getCategory } from "@/lib/puzzles";
import { useProgress } from "@/lib/state/progress-context";
import StarRating from "@/components/puzzle/StarRating";
import EndgameShell from "@/components/endgame/EndgameShell";
import ColorOfSquare from "@/components/blindfold/ColorOfSquare";
import SameDiagonal from "@/components/blindfold/SameDiagonal";
import KnightRoutes from "@/components/blindfold/KnightRoutes";
import type { PiecePlacement } from "@/lib/logic/types";

const ENDGAME_POSITIONS: Record<string, { title: string; instruction: string; placements: PiecePlacement[] }> = {
  "endings-kpk": {
    title: "King + Pawn vs King",
    instruction: "Promote the pawn! Every wrong move is a draw.",
    placements: [
      { piece: "K", color: "w", square: "d6" },
      { piece: "P", color: "w", square: "d4" },
      { piece: "K", color: "b", square: "d8" },
    ],
  },
};

export default function PieceLearnPage({
  params,
}: {
  params: Promise<{ piece: string }>;
}) {
  const { piece } = use(params);

  // Check for endgame trainers
  const endgame = ENDGAME_POSITIONS[piece];
  if (endgame) {
    return (
      <main className="min-h-screen p-4">
        <Link
          href="/learn/endings"
          className="text-sm text-muted hover:text-foreground mb-2 inline-block ml-4"
        >
          &larr; Back to endings
        </Link>
        <EndgameShell
          title={endgame.title}
          instruction={endgame.instruction}
          placements={endgame.placements}
        />
      </main>
    );
  }

  // Check for blindfold trainers
  if (piece === "blindfold-color") {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <Link href="/learn/blindfold" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
          &larr; Back to blindfold
        </Link>
        <ColorOfSquare />
      </main>
    );
  }
  if (piece === "blindfold-diagonals") {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <Link href="/learn/blindfold" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
          &larr; Back to blindfold
        </Link>
        <SameDiagonal />
      </main>
    );
  }
  if (piece === "blindfold-knight-routes") {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <Link href="/learn/blindfold" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
          &larr; Back to blindfold
        </Link>
        <KnightRoutes />
      </main>
    );
  }

  // Check if this is a category page
  const category = getCategory(piece);
  if (category) {
    return <CategoryPage categoryKey={piece} />;
  }

  return <PuzzleListPage pieceKey={piece} />;
}

function CategoryPage({ categoryKey }: { categoryKey: string }) {
  const category = getCategory(categoryKey)!;
  const { state, getPuzzleProgress } = useProgress();

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back to home
      </Link>

      <div className="flex items-center gap-4 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={category.icon} alt={category.name} className="w-16 h-16" />
        <div>
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted">{category.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {category.subcategories.map((sub) => {
          const puzzleSet = getPuzzlesForPiece(sub.key);
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

          if (sub.comingSoon) {
            return (
              <div
                key={sub.key}
                className="flex items-center justify-between p-5 rounded-xl border border-card-border opacity-40"
              >
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sub.icon} alt={sub.name} className="w-10 h-10" />
                  <div>
                    <h3 className="font-bold">{sub.name}</h3>
                    <p className="text-sm text-muted">{sub.description}</p>
                  </div>
                </div>
                <span className="text-xs text-faint">Coming soon</span>
              </div>
            );
          }

          return (
            <Link
              key={sub.key}
              href={`/learn/${sub.key}`}
              className="flex items-center justify-between p-5 rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sub.icon} alt={sub.name} className="w-10 h-10" />
                <div>
                  <h3 className="font-bold">{sub.name}</h3>
                  <p className="text-sm text-muted">{sub.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-faint">{completedPuzzles}/{totalPuzzles}</span>
                {completedPuzzles > 0 && completedPuzzles === totalPuzzles && (
                  <div className="mt-1"><StarRating stars={bestStars} size="sm" /></div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

function PuzzleListPage({ pieceKey }: { pieceKey: string }) {
  const puzzleSet = getPuzzlesForPiece(pieceKey);
  const pieceInfo = PIECES.find((p) => p.key === pieceKey);
  const { state, isPuzzleUnlocked, getPuzzleProgress } = useProgress();

  // For sub-categories, find the parent category for back-navigation
  const parentCategory = pieceKey.startsWith("checkmate-")
    ? "checkmate"
    : pieceKey.startsWith("tactics-")
      ? "tactics"
      : null;
  const backHref = parentCategory ? `/learn/${parentCategory}` : "/";
  const backLabel = parentCategory ? "Back to patterns" : "Back to home";

  // Get display info — either from PIECES or from the puzzle set itself
  const displayName = pieceInfo?.name ?? puzzleSet?.name ?? "Puzzles";
  const displayDescription = pieceInfo?.description ?? "";
  const displayIcon = pieceInfo?.icon ?? "/pieces/wQ.svg";

  if (!puzzleSet) {
    return (
      <main className="min-h-screen p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Not found</h1>
        <Link href="/" className="text-muted hover:underline">Back to home</Link>
      </main>
    );
  }

  const puzzleIds = puzzleSet.puzzles.map((p) => p.id);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href={backHref} className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; {backLabel}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={displayIcon} alt={displayName} className="w-16 h-16" />
        <div>
          <h1 className="text-3xl font-bold">{displayName} Puzzles</h1>
          {displayDescription && <p className="text-muted">{displayDescription}</p>}
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
                  href={`/learn/${pieceKey}/${puzzle.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-card-border bg-card hover:border-foreground/30 hover:shadow transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-faint w-6 text-right">{idx + 1}.</span>
                    <div>
                      <span className="font-medium">{puzzle.title}</span>
                      <p className="text-xs text-faint">{puzzle.instruction}</p>
                    </div>
                  </div>
                  {progress?.completed && (
                    <StarRating stars={progress.bestStars} size="sm" />
                  )}
                </Link>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-lg border border-card-border opacity-40">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-faint w-6 text-right">{idx + 1}.</span>
                    <span className="font-medium">{puzzle.title}</span>
                  </div>
                  <span className="text-xs text-faint">Locked</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
