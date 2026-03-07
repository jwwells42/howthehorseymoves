"use client";

import StarRating from "./StarRating";

interface SuccessOverlayProps {
  stars: number;
  onNext?: () => void;
  onRetry: () => void;
}

export default function SuccessOverlay({ stars, onNext, onRetry }: SuccessOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-2xl max-w-xs mx-4">
        <div className="text-5xl mb-2">&#127881;</div>
        <h3 className="text-2xl font-bold mb-3">Puzzle Complete!</h3>
        <StarRating stars={stars} size="lg" />
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Retry
          </button>
          {onNext && (
            <button
              onClick={onNext}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors text-sm font-medium"
            >
              Next Puzzle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
