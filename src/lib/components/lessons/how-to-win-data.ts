import type { SquareId } from "$lib/logic/types";
import type { Arrow } from "$lib/logic/pgn";

/* ── Step types ──────────────────────────────────────────── */

export type ValidationMode = "any" | "check" | "checkmate" | "no-stalemate";

export interface LessonStep {
  slug: string;
  title: string;
  instruction: string;
  fen: string;
  type: "demo" | "interactive";
  arrows?: Arrow[];
  dangerSquares?: SquareId[];
  safeSquares?: SquareId[];
  validation?: ValidationMode;
  isVictory?: boolean;
}

/* ── Sections ────────────────────────────────────────────── */

export type HowToWinSection = "check" | "checkmate" | "stalemate";

export interface SectionInfo {
  key: HowToWinSection;
  title: string;
  description: string;
  icon: string;
  storageKey: string;
}

export const SECTIONS: SectionInfo[] = [
  {
    key: "check",
    title: "Check",
    description: "Learn what check is and three ways to escape it.",
    icon: "/pieces/wR.svg",
    storageKey: "how-to-win-check-stars",
  },
  {
    key: "checkmate",
    title: "Checkmate",
    description: "Trap the king with nowhere to go. That's how you win!",
    icon: "/pieces/wQ.svg",
    storageKey: "how-to-win-checkmate-stars",
  },
  {
    key: "stalemate",
    title: "Stalemate",
    description: "Don't let the game end in a draw when you're winning!",
    icon: "/pieces/bK.svg",
    storageKey: "how-to-win-stalemate-stars",
  },
];

const CHECK_STEPS: LessonStep[] = [
  {
    slug: "what-is-check",
    title: "Check!",
    instruction: "The rook attacks the king. That's check!",
    fen: "4r3/8/8/8/8/8/8/4K3 w - - 0 1",
    type: "demo",
    arrows: [{ from: "e8" as SquareId, to: "e1" as SquareId, color: "#dc2626" }],
  },
  {
    slug: "move-the-king",
    title: "Move the King",
    instruction: "Your king is in check! Move it to safety.",
    fen: "4r3/8/8/8/8/8/8/4K3 w - - 0 1",
    type: "interactive",
    arrows: [{ from: "e8" as SquareId, to: "e1" as SquareId, color: "#dc2626" }],
    validation: "any",
  },
  {
    slug: "capture",
    title: "Capture!",
    instruction: "Take the piece that's attacking your king!",
    fen: "8/8/8/8/8/5n2/4B3/6K1 w - - 0 1",
    type: "interactive",
    arrows: [
      { from: "f3" as SquareId, to: "g1" as SquareId, color: "#dc2626" },
      { from: "e2" as SquareId, to: "f3" as SquareId, color: "#22c55e" },
    ],
    validation: "any",
  },
  {
    slug: "block",
    title: "Block!",
    instruction: "Put a piece in the way to block the attack!",
    fen: "4rbk1/6pp/8/8/8/5B2/r2P1P2/3RKR2 w - - 0 1",
    type: "interactive",
    arrows: [
      { from: "e8" as SquareId, to: "e1" as SquareId, color: "#dc2626" },
      { from: "f3" as SquareId, to: "e2" as SquareId, color: "#22c55e" },
    ],
    validation: "any",
  },
  {
    slug: "give-check",
    title: "Give Check!",
    instruction: "Move a piece to attack their king!",
    fen: "4k3/8/8/8/8/8/8/3QK3 w - - 0 1",
    type: "interactive",
    validation: "check",
  },
];

const CHECKMATE_STEPS: LessonStep[] = [
  {
    slug: "what-is-checkmate",
    title: "Checkmate!",
    instruction: "The king is in check and can't escape. You win!",
    fen: "4R1k1/5ppp/8/8/8/8/8/6K1 b - - 0 1",
    type: "demo",
    arrows: [{ from: "e8" as SquareId, to: "g8" as SquareId, color: "#22c55e" }],
    dangerSquares: ["f8" as SquareId, "h8" as SquareId],
    isVictory: true,
  },
  {
    slug: "back-rank",
    title: "Deliver Checkmate!",
    instruction: "Find the move that traps the king. Checkmate!",
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    slug: "rook-and-king",
    title: "Deliver Checkmate!",
    instruction: "Use the rook to trap the king!",
    fen: "7k/8/6K1/8/8/8/8/R7 w - - 0 1",
    type: "interactive",
    arrows: [
      { from: "g6" as SquareId, to: "f7" as SquareId, color: "#22c55e" },
      { from: "g6" as SquareId, to: "g7" as SquareId, color: "#22c55e" },
      { from: "g6" as SquareId, to: "h7" as SquareId, color: "#22c55e" },
    ],
    validation: "checkmate",
  },
  {
    slug: "queen-and-king",
    title: "Deliver Checkmate!",
    instruction: "Use the queen to trap the king!",
    fen: "k7/8/1K6/8/8/8/8/3Q4 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    slug: "queen-corner",
    title: "Deliver Checkmate!",
    instruction: "Put the queen where the king can't escape!",
    fen: "7k/7p/5Q2/8/8/8/8/6K1 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    slug: "two-rooks",
    title: "Deliver Checkmate!",
    instruction: "Use both rooks to trap the king!",
    fen: "6k1/1R6/8/8/8/8/8/R3K3 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
];

const STALEMATE_STEPS: LessonStep[] = [
  {
    slug: "what-is-stalemate",
    title: "Stalemate",
    instruction: "The king is NOT in check, but every square is attacked. It's a draw!",
    fen: "k7/8/1Q6/8/8/8/8/6K1 b - - 0 1",
    type: "demo",
    arrows: [
      { from: "b6" as SquareId, to: "a7" as SquareId, color: "#dc2626" },
      { from: "b6" as SquareId, to: "b7" as SquareId, color: "#dc2626" },
      { from: "b6" as SquareId, to: "b8" as SquareId, color: "#dc2626" },
    ],
    dangerSquares: ["a7" as SquareId, "b7" as SquareId, "b8" as SquareId],
    safeSquares: ["a8" as SquareId],
  },
  {
    slug: "dont-stalemate-1",
    title: "Win, Don't Draw!",
    instruction: "Five moves checkmate. One is a draw. Don't pick that one!",
    fen: "7k/4Q3/6K1/8/8/8/8/8 w - - 0 1",
    type: "interactive",
    validation: "no-stalemate",
  },
  {
    slug: "dont-stalemate-2",
    title: "Win, Don't Draw!",
    instruction: "Checkmate the king — don't stalemate!",
    fen: "8/8/8/8/8/2K5/7Q/k7 w - - 0 1",
    type: "interactive",
    validation: "no-stalemate",
  },
];

const SECTION_STEPS: Record<HowToWinSection, LessonStep[]> = {
  check: CHECK_STEPS,
  checkmate: CHECKMATE_STEPS,
  stalemate: STALEMATE_STEPS,
};

/** Get the steps array for a section. */
export function getStepsForSection(section: HowToWinSection): LessonStep[] {
  return SECTION_STEPS[section];
}

/** Find the step index for a slug within a section. Returns 0 if not found. */
export function getStepIndex(section: HowToWinSection, slug: string): number {
  const steps = SECTION_STEPS[section];
  const idx = steps.findIndex((s) => s.slug === slug);
  return idx >= 0 ? idx : 0;
}

/** Get step slugs and titles for a section (used by the section listing page). */
export function getSectionSteps(
  section: HowToWinSection,
): { slug: string; title: string; instruction: string }[] {
  return SECTION_STEPS[section].map((s) => ({
    slug: s.slug,
    title: s.title,
    instruction: s.instruction,
  }));
}

export function mistakesToStars(m: number): number {
  if (m === 0) return 3;
  if (m <= 3) return 2;
  return 1;
}

export function updateCombinedStars(): void {
  const allKeys = SECTIONS.map((s) => s.storageKey);
  const allStars = allKeys.map((k) =>
    parseInt(localStorage.getItem(k) ?? "0", 10),
  );
  const min = Math.min(...allStars);
  localStorage.setItem("how-to-win-best-stars", min.toString());
}
