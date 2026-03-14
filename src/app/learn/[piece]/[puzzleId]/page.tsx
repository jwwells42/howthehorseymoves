"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPuzzle, getPuzzlesForPiece, PIECES } from "@/lib/puzzles";
import PuzzleShell from "@/components/puzzle/PuzzleShell";
import HowToWinLesson from "@/components/lessons/HowToWinLesson";
import type { HowToWinSection } from "@/components/lessons/HowToWinLesson";
import PolgarTrainer, { MATE_LABELS } from "@/components/polgar/PolgarTrainer";

export default function PuzzlePage({
  params,
}: {
  params: Promise<{ piece: string; puzzleId: string }>;
}) {
  const { piece, puzzleId } = use(params);
  const router = useRouter();

  // How to Win step routes: /learn/how-to-win-checkmate/back-rank
  const howToWinMatch = piece.match(/^how-to-win-(check|checkmate|stalemate)$/);
  if (howToWinMatch) {
    const section = howToWinMatch[1] as HowToWinSection;
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <Link href={`/learn/${piece}`} className="text-sm text-muted hover:text-foreground mb-4 inline-block">
          &larr; Back to {section === "check" ? "Check" : section === "checkmate" ? "Checkmate" : "Stalemate"}
        </Link>
        <HowToWinLesson section={section} stepSlug={puzzleId} />
      </main>
    );
  }

  // Polgar mate trainers: /learn/mate-in-one/42
  const mateMap: Record<string, "mate-in-1" | "mate-in-2" | "mate-in-3"> = {
    "mate-in-one": "mate-in-1",
    "mate-in-two": "mate-in-2",
    "mate-in-three": "mate-in-3",
  };
  if (piece in mateMap) {
    const mateType = mateMap[piece];
    const id = parseInt(puzzleId, 10);
    if (isNaN(id) || id < 1) {
      return (
        <main className="min-h-screen p-6 max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Puzzle not found</h1>
          <Link href={`/learn/${piece}`} className="text-muted hover:underline">Back to {MATE_LABELS[mateType]}</Link>
        </main>
      );
    }
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
          &larr; Back to home
        </Link>
        <PolgarTrainer type={mateType} puzzleId={id} />
      </main>
    );
  }

  const puzzle = getPuzzle(piece, puzzleId);
  const puzzleSet = getPuzzlesForPiece(piece);

  if (!puzzle || !puzzleSet) {
    return (
      <main className="min-h-screen p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Puzzle not found</h1>
        <Link href="/" className="text-muted hover:underline">Back to home</Link>
      </main>
    );
  }

  const currentIdx = puzzleSet.puzzles.findIndex((p) => p.id === puzzleId);
  const nextPuzzle = puzzleSet.puzzles[currentIdx + 1];

  // Cross-category navigation for Basics pieces
  const pieceIdx = PIECES.findIndex((p) => p.key === piece);
  const isBasicsPiece = pieceIdx !== -1;
  const isLastInSet = !nextPuzzle;
  const nextBasicsPiece = isBasicsPiece && isLastInSet ? PIECES[pieceIdx + 1] : null;

  let handleNext: () => void;
  let nextLabel: string | undefined;

  if (nextPuzzle) {
    handleNext = () => router.push(`/learn/${piece}/${nextPuzzle.id}`);
  } else if (nextBasicsPiece) {
    const nextSet = getPuzzlesForPiece(nextBasicsPiece.key);
    const firstPuzzleId = nextSet?.puzzles[0]?.id;
    nextLabel = `Continue to ${nextBasicsPiece.name}!`;
    handleNext = firstPuzzleId
      ? () => router.push(`/learn/${nextBasicsPiece.key}/${firstPuzzleId}`)
      : () => router.push(`/learn/${nextBasicsPiece.key}`);
  } else if (isBasicsPiece && isLastInSet) {
    // Last puzzle of last basics category (pawn) → The Board
    nextLabel = "Continue to The Board!";
    handleNext = () => router.push("/board");
  } else {
    handleNext = () => router.push(`/learn/${piece}`);
  }

  return (
    <main className="min-h-screen p-4">
      <Link
        href={`/learn/${piece}`}
        className="text-sm text-muted hover:text-foreground mb-2 inline-block ml-4"
      >
        &larr; Back to {piece} puzzles
      </Link>
      <PuzzleShell key={puzzle.id} puzzle={puzzle} onNext={handleNext} nextLabel={nextLabel} />
    </main>
  );
}
