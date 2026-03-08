"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPuzzle, getPuzzlesForPiece } from "@/lib/puzzles";
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
        <Link href="/" className="text-blue-500 hover:underline">Back to home</Link>
      </main>
    );
  }

  const currentIdx = puzzleSet.puzzles.findIndex((p) => p.id === puzzleId);
  const nextPuzzle = puzzleSet.puzzles[currentIdx + 1];

  const handleNext = nextPuzzle
    ? () => router.push(`/learn/${piece}/${nextPuzzle.id}`)
    : () => router.push(`/learn/${piece}`);

  return (
    <main className="min-h-screen p-4">
      <Link
        href={`/learn/${piece}`}
        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block ml-4"
      >
        &larr; Back to {piece} puzzles
      </Link>
      <PuzzleShell key={puzzle.id} puzzle={puzzle} onNext={handleNext} />
    </main>
  );
}
