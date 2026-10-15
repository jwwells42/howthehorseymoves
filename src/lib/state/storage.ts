/**
 * Saving progress to localStorage.
 *
 * A best score is saved as the larger of the new score and what is already
 * saved, never as "the new score, because it beats the one this page read
 * when it opened". A tab left open for days would otherwise lower a best that
 * another tab (or another device, through sync) raised in the meantime.
 *
 * Every save calls noteChange(), which is how sync knows there is something
 * to send.
 */

const listeners = new Set<() => void>();

/** Called after progress is saved. Returns a function that stops listening. */
export function onChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function noteChange() {
  for (const fn of listeners) fn();
}

/** A saved number, or 0 when there is none. */
export function readNumber(key: string): number {
  try {
    return parseInt(localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Saves `value` if it beats what is saved. Returns the best, saved or new. */
export function saveBest(key: string, value: number): number {
  const saved = readNumber(key);
  if (value <= saved) return saved;
  try {
    localStorage.setItem(key, String(value));
  } catch {}
  noteChange();
  return value;
}
