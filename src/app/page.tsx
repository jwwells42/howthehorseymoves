"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PieceCard from "@/components/progress/PieceCard";
import StarRating from "@/components/puzzle/StarRating";
import { PIECES, CATEGORIES, getPuzzlesForPiece, CategoryInfo } from "@/lib/puzzles";
import { useProgress } from "@/lib/state/progress-context";

export default function Home() {
  const { state, getPuzzleProgress } = useProgress();
  const [coordStars, setCoordStars] = useState(0);
  const [showStudy, setShowStudy] = useState(false);
  useEffect(() => {
    setCoordStars(parseInt(localStorage.getItem("coord-best-stars") ?? "0", 10));
  }, []);

  // Check if all basics are complete
  const allBasicsDone = state.loaded && PIECES.every((piece) => {
    const puzzleSet = getPuzzlesForPiece(piece.key);
    if (!puzzleSet) return false;
    return puzzleSet.puzzles.every((p) => getPuzzleProgress(p.id)?.completed);
  });

  // Find the first incomplete basics piece and the next unsolved puzzle
  let upNextPieceKey: string | null = null;
  let continueTarget: { piece: string; puzzleId: string; label: string } | null = null;

  if (state.loaded) {
    for (const piece of PIECES) {
      const puzzleSet = getPuzzlesForPiece(piece.key);
      if (!puzzleSet) continue;
      const allDone = puzzleSet.puzzles.every(
        (p) => getPuzzleProgress(p.id)?.completed
      );
      if (!allDone) {
        upNextPieceKey = piece.key;
        // Find the first unsolved puzzle in this set
        for (const p of puzzleSet.puzzles) {
          if (!getPuzzleProgress(p.id)?.completed) {
            continueTarget = {
              piece: piece.key,
              puzzleId: p.id,
              label: `${piece.name} Puzzle ${puzzleSet.puzzles.indexOf(p) + 1}`,
            };
            break;
          }
        }
        break;
      }
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">How The Horsey Moves</h1>
        <p className="text-muted">
          Learn how each chess piece moves through interactive puzzles
        </p>
      </div>

      {/* === Basics === */}
      <SectionHeader title="Basics" subtitle="Learn how each piece moves" />

      {/* Continue button */}
      {continueTarget && (
        <Link href={`/learn/${continueTarget.piece}/${continueTarget.puzzleId}`}>
          <div className="mb-4 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 transition-colors text-white text-center font-bold text-lg cursor-pointer">
            Continue: {continueTarget.label}
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PIECES.map((piece, idx) => {
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
              stepNumber={idx + 1}
              isUpNext={piece.key === upNextPieceKey}
            />
          );
        })}

        {/* The Board card */}
        <Link href="/board">
          <div className="rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg cursor-pointer p-6 transition-all h-full flex flex-col">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded bg-[#7a9e6e] border-2 border-[#d4c4a0] flex items-center justify-center text-2xl font-bold text-[#d4c4a0]">
                e4
              </div>
              <h3 className="text-lg font-bold">The Board</h3>
            </div>
            <p className="text-sm text-muted mb-3 flex-1">
              Learn squares, coordinates, and board vision.
            </p>
            <div className="text-xs text-faint">
              {coordStars > 0 && <StarRating stars={coordStars} size="sm" />}
            </div>
          </div>
        </Link>

        {/* Play a Game card (step 9 capstone) */}
        <Link href="/play?level=random">
          <div
            className={`rounded-xl border p-6 transition-all h-full flex flex-col relative ${
              allBasicsDone
                ? "border-card-border bg-card hover:border-foreground/30 hover:shadow-lg cursor-pointer"
                : upNextPieceKey === null
                  ? "border-yellow-400 bg-card hover:shadow-lg cursor-pointer"
                  : "border-card-border bg-card hover:border-foreground/30 hover:shadow-lg cursor-pointer"
            }`}
            style={!allBasicsDone && upNextPieceKey === null ? { animation: "up-next-glow 2s ease-in-out infinite" } : undefined}
          >
            <div className={`absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              allBasicsDone
                ? "bg-green-600 border-green-500 text-white"
                : "bg-card border-card-border text-faint"
            }`}>
              {allBasicsDone ? "\u2713" : 9}
            </div>
            <div className="flex items-center gap-4 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pieces/wK.svg" alt="Play" className="w-12 h-12" />
              <h3 className="text-lg font-bold">Play a Game!</h3>
            </div>
            <p className="text-sm text-muted mb-3 flex-1">
              Use everything you&apos;ve learned against the Random Bot.
            </p>
            <div className="text-xs text-faint">&nbsp;</div>
          </div>
        </Link>
      </div>

      {state.loaded && (() => {
        const allPieces3Star = PIECES.every((piece) => {
          const puzzleSet = getPuzzlesForPiece(piece.key);
          if (!puzzleSet) return false;
          return puzzleSet.puzzles.every((p) => {
            const progress = getPuzzleProgress(p.id);
            return progress?.completed && progress.bestStars >= 3;
          });
        });
        if (!allPieces3Star || coordStars < 3) return null;
        return (
          <div className="mt-4 py-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-center animate-fade-in relative overflow-hidden">
            <div className="absolute inset-0" style={{ animation: "horsey-x 4.7s linear infinite alternate" }}>
              <div className="absolute inset-0" style={{ animation: "horsey-y 3.1s linear infinite alternate" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pieces/wN.svg"
                  alt="Knight"
                  className="w-16 h-16"
                  style={{ animation: "horsey-spin 3s linear infinite" }}
                />
              </div>
            </div>
            <p className="font-bold text-lg relative pointer-events-none">The horsey is proud of you!</p>
            <p className="text-sm text-muted relative pointer-events-none">You earned 3 stars on every basic. Now go use those pieces!</p>
          </div>
        );
      })()}

      {/* === Study === */}
      {allBasicsDone ? (
        <SectionHeader title="Study" subtitle="Bring the pieces to life" />
      ) : (
        <div className="mt-10 mb-4">
          <button
            onClick={() => setShowStudy(!showStudy)}
            className="flex items-center gap-3 w-full text-left"
          >
            <h2 className="text-lg font-bold whitespace-nowrap text-faint">Study</h2>
            <div className="flex-1 border-t border-foreground/15" />
            <span className="text-xs text-faint">{showStudy ? "Hide" : "Show more"}</span>
          </button>
          <p className="text-sm text-faint mt-1">Complete the basics first, or peek ahead</p>
        </div>
      )}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${!allBasicsDone && !showStudy ? "hidden" : ""}`}>
        {/* Category cards */}
        {CATEGORIES.map((cat) => (
          <CategoryCard key={cat.key} cat={cat} state={state} getPuzzleProgress={getPuzzleProgress} />
        ))}

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

        {/* Openings card */}
        <Link href="/openings">
          <div className="rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg cursor-pointer p-6 transition-all h-full flex flex-col">
            <div className="flex items-center gap-4 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pieces/wP.svg" alt="Openings" className="w-12 h-12" />
              <h3 className="text-lg font-bold">Openings</h3>
            </div>
            <p className="text-sm text-muted mb-3 flex-1">
              Learn opening lines move by move.
            </p>
            <div className="text-xs text-faint">&nbsp;</div>
          </div>
        </Link>

        {/* Model Games card */}
        <Link href="/games">
          <div className="rounded-xl border border-card-border bg-card hover:border-foreground/30 hover:shadow-lg cursor-pointer p-6 transition-all h-full flex flex-col">
            <div className="flex items-center gap-4 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pieces/bK.svg" alt="Model Games" className="w-12 h-12" />
              <h3 className="text-lg font-bold">Model Games</h3>
            </div>
            <p className="text-sm text-muted mb-3 flex-1">
              Study famous games move by move.
            </p>
            <div className="text-xs text-faint">&nbsp;</div>
          </div>
        </Link>

      </div>
    </main>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mt-10 mb-4 first:mt-0">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-lg font-bold whitespace-nowrap">{title}</h2>
        <div className="flex-1 border-t border-foreground/15" />
      </div>
      <p className="text-sm text-faint">{subtitle}</p>
    </div>
  );
}

function CategoryCard({
  cat,
  state,
  getPuzzleProgress,
}: {
  cat: CategoryInfo;
  state: { loaded: boolean };
  getPuzzleProgress: (id: string) => { completed?: boolean } | undefined;
}) {
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
    <Link href={`/learn/${cat.key}`}>
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
}
