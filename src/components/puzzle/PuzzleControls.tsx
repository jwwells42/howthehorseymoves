"use client";

interface PuzzleControlsProps {
  onReset: () => void;
  onHint?: () => void;
}

export default function PuzzleControls({ onReset, onHint }: PuzzleControlsProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onReset}
        className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
      >
        Reset
      </button>
      {onHint && (
        <button
          onClick={onHint}
          className="px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors text-sm font-medium text-amber-800 dark:text-amber-200"
        >
          Hint
        </button>
      )}
    </div>
  );
}
