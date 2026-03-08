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
        className="px-4 py-2 rounded-lg bg-btn hover:bg-btn-hover transition-colors text-sm font-medium"
      >
        Reset
      </button>
      {onHint && (
        <button
          onClick={onHint}
          className="px-4 py-2 rounded-lg bg-amber-900/40 hover:bg-amber-900/60 transition-colors text-sm font-medium text-amber-200"
        >
          Hint
        </button>
      )}
    </div>
  );
}
