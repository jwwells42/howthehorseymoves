/**
 * The ways to study an opening, and their settings.
 *
 * - watch: every line plays itself, one after another
 * - learn: new moves, in one of two orders (below)
 * - review: the moves due for review
 * - test: a game played from memory, start to end (games only)
 */
export type StudyMode = "watch" | "learn" | "review" | "test";

/** Test: the stars for a game played with this many mistakes. */
export function testStars(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

/**
 * Learn's order, the student's preference:
 * - breadth: every line, a few new moves further each visit
 * - depth: one line at a time, to its end
 */
export type StudyOrder = "breadth" | "depth";

/** Breadth: how many new moves of yours each visit to a line adds. */
export const PER_VISIT_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }));
export const DEFAULT_PER_VISIT = 3;

/** Watch: milliseconds per move. */
export const SPEED_OPTIONS = [
  { value: 3000, label: "3 s" },
  { value: 2000, label: "2 s" },
  { value: 1000, label: "1 s" },
  { value: 500, label: "½ s" },
];
export const DEFAULT_SPEED = 1000;

/** Settings that are the same for every opening, remembered on this device. */
export const PREFS = {
  perVisit: "opening-per-visit",
  speed: "opening-flow-speed", // Watch was once called Flow; the key stays so saved speeds are kept
  autoNext: "opening-auto-next",
  blindfold: "opening-blindfold",
};

/** Each opening remembers Learn's order. */
export function orderKey(openingId: string): string {
  return `opening-${openingId}-order`;
}

/** Each opening remembers the lines left out, by their moves (see `lineId`). */
export function skippedKey(openingId: string): string {
  return `opening-${openingId}-skipped`;
}
