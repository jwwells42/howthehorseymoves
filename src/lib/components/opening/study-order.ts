/**
 * The ways to study an opening, and their settings.
 *
 * - flow: every line plays itself, one after another, to watch
 * - breadth: every line, a few new moves further each visit
 * - depth: one line at a time, to its end
 */
export type StudyOrder = "flow" | "breadth" | "depth";

/** Breadth: how many new moves of yours each visit to a line adds. */
export const PER_VISIT_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }));
export const DEFAULT_PER_VISIT = 3;

/** Flow: milliseconds per move. */
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
  speed: "opening-flow-speed",
  autoNext: "opening-auto-next",
};

/** Each opening remembers how it was last studied. */
export function orderKey(openingId: string): string {
  return `opening-${openingId}-order`;
}
