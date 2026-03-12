"use client";

import Link from "next/link";
import StarRating from "@/components/puzzle/StarRating";

interface PieceCardProps {
  pieceKey: string;
  name: string;
  description: string;
  iconPath: string;
  totalPuzzles: number;
  completedPuzzles: number;
  bestStars: number;
  locked: boolean;
  stepNumber?: number;
  isUpNext?: boolean;
}

export default function PieceCard({
  pieceKey,
  name,
  description,
  iconPath,
  totalPuzzles,
  completedPuzzles,
  bestStars,
  locked,
  stepNumber,
  isUpNext,
}: PieceCardProps) {
  const allDone = completedPuzzles > 0 && completedPuzzles === totalPuzzles;

  const content = (
    <div
      className={`rounded-xl border p-6 transition-all h-full flex flex-col relative ${
        locked
          ? "border-card-border bg-card opacity-50 cursor-not-allowed"
          : isUpNext
            ? "border-yellow-400 bg-card hover:shadow-lg cursor-pointer"
            : "border-card-border bg-card hover:border-foreground/30 hover:shadow-lg cursor-pointer"
      }`}
      style={isUpNext ? { animation: "up-next-glow 2s ease-in-out infinite" } : undefined}
    >
      {/* Step number badge */}
      {stepNumber != null && (
        <div
          className={`absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
            allDone
              ? "bg-green-600 border-green-500 text-white"
              : isUpNext
                ? "bg-yellow-500 border-yellow-400 text-black"
                : "bg-card border-card-border text-faint"
          }`}
        >
          {allDone ? "\u2713" : stepNumber}
        </div>
      )}

      {/* Up next badge */}
      {isUpNext && (
        <div className="absolute -top-2.5 right-3 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
          {completedPuzzles === 0 ? "Start here!" : "Up next!"}
        </div>
      )}

      <div className="flex items-center gap-4 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconPath} alt={name} className="w-12 h-12" />
        <div>
          <h3 className="text-lg font-bold">{name}</h3>
          {locked && <span className="text-xs text-faint">Locked</span>}
        </div>
      </div>
      <p className="text-sm text-muted mb-3 flex-1">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-faint">
          {locked ? "\u00A0" : `${completedPuzzles}/${totalPuzzles} puzzles`}
        </span>
        {!locked && allDone && <StarRating stars={bestStars} size="sm" />}
      </div>
    </div>
  );

  if (locked) return content;
  return <Link href={`/learn/${pieceKey}`}>{content}</Link>;
}
