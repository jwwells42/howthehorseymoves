import type { SquareId } from '$lib/logic/types';

/**
 * Colours for the arrows and square highlights drawn on a board.
 *
 * Each is a CSS custom property from app.css. Apply it with `style:`, as in
 * `style:fill={mark}`. An SVG presentation attribute like `fill={mark}` does not
 * read var().
 */
export const MARK = {
  /** The move to play, a safe square, a way out. */
  good: 'var(--correct)',
  /** Danger: an attack, a check, a square the king cannot go to. */
  danger: 'var(--wrong)',
  /** A path or an area to notice. */
  note: 'var(--highlight)',
  /** A fourth colour, when three are not enough. */
  other: 'var(--mark-other)',
} as const;

/**
 * Lichess exports an arrow or square colour as a letter: `[%cal Ge2e4]`. Its
 * green and red look the same to many colour-blind students, so each letter
 * becomes what it is usually used to mean. A green arrow in a Lichess study
 * shows here in the app's colour for a right move.
 */
export const LICHESS_MARKS: Record<string, string> = {
  G: MARK.good,
  R: MARK.danger,
  Y: MARK.note,
  B: MARK.other,
};

/**
 * How a highlight is drawn:
 * - `tint` (the default) lets the square's own colour show through
 * - `solid` covers the square, which reads better on a small board
 * - `ring` outlines the square, for when its colour is the point
 */
export type HighlightLook = 'tint' | 'solid' | 'ring';

export interface SquareHighlight {
  square: SquareId;
  /** A colour from MARK. */
  color: string;
  look?: HighlightLook;
}

/** The same highlight on each of a list of squares. */
export function highlight(squares: string[], color: string, look?: HighlightLook): SquareHighlight[] {
  return squares.map((square) => ({ square: square as SquareId, color, look }));
}
