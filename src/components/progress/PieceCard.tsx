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
}: PieceCardProps) {
  const content = (
    <div
      className={`rounded-xl border p-6 transition-all ${
        locked
          ? "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
          : "border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow-lg cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-4 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconPath} alt={name} className="w-12 h-12" />
        <div>
          <h3 className="text-lg font-bold">{name}</h3>
          {locked && <span className="text-xs text-gray-400">Locked</span>}
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
      {!locked && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {completedPuzzles}/{totalPuzzles} puzzles
          </span>
          {completedPuzzles > 0 && <StarRating stars={bestStars} size="sm" />}
        </div>
      )}
    </div>
  );

  if (locked) return content;
  return <Link href={`/learn/${pieceKey}`}>{content}</Link>;
}
