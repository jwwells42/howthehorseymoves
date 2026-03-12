"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPuzzle, getPuzzlesForPiece, PIECES } from "@/lib/puzzles";
import PuzzleShell from "@/components/puzzle/PuzzleShell";

export default function PuzzlePage({
  params,
}: {
  params: Promise<{ piece: string; puzzleId: string }>;
}) {
  const { piece, puzzleId } = use(params);
  const router = useRouter();
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
