/**
 * The games library's list: what one game looks like in it, and the filters.
 * Pure functions, used by the server (to read an imported game once) and by
 * the /library page (to filter in the browser), and tested in library.test.ts.
 */

import { parseGamePgn, extractMainLine, readHeaders, readTypedMove, applyMove } from '$lib/logic/pgn';
import { parseFen, createBoardState, type BoardState, type PieceColor } from '$lib/logic/types';

/** How many plies of each game the opening filter can look at. */
export const START_PLIES = 20;

export interface GameSummary {
  white: string;
  black: string;
  /** As in the PGN: 2025.10.09 */
  date: string;
  time: string;
  event: string;
  /** 1-0, 0-1, 1/2-1/2 or * */
  result: string;
  termination: string;
  plies: number;
  /** The first START_PLIES moves in SAN, space-separated */
  start: string;
  /** The same moves as from-to squares (e2e4 …), for matching typed moves */
  startSquares: string;
  /** ?!, ? and ?? counts once the mistake check has run: [white, black] */
  marks?: { inaccuracies: [number, number]; mistakes: [number, number]; blunders: [number, number] };
}

export interface LibraryGame {
  id: string;
  summary: GameSummary;
}

/**
 * One game's summary, and the text that says whether two imports are the same
 * game (players, date, time, event and moves). Throws if the moves can't be read.
 */
export function summarize(pgn: string): { summary: GameSummary; identity: string } {
  const headers = readHeaders(pgn);
  const { moves } = extractMainLine(parseGamePgn(pgn));
  const summary: GameSummary = {
    white: headers.White ?? '',
    black: headers.Black ?? '',
    date: headers.Date ?? '',
    time: headers.Time ?? headers.UTCTime ?? '',
    event: headers.Event ?? '',
    result: headers.Result ?? '*',
    termination: headers.Termination ?? '',
    plies: moves.length,
    start: moves.slice(0, START_PLIES).map((m) => m.san).join(' '),
    startSquares: moves.slice(0, START_PLIES).map((m) => `${m.from}${m.to}`).join(' '),
  };
  const identity = [summary.white, summary.black, summary.date, summary.time, summary.event, moves.map((m) => m.san).join(' ')].join('|');
  return { summary, identity };
}

const START_BOARD = (() => {
  const { placements, castlingRights, enPassantSquare } = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  return createBoardState(placements, { castlingRights, enPassantSquare });
})();

/**
 * Typed opening moves ("1.e4 c5 2.nf3", "e4 c5 Nf3") as from-to squares, or
 * null if one of them isn't a legal move there. Read as forgivingly as the
 * blindfold trainers read a typed move.
 */
export function readTypedLine(text: string): string[] | null {
  const words = text
    .replace(/\d+\.(\.\.)?/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let board: BoardState = START_BOARD;
  let color: PieceColor = 'w';
  const squares: string[] = [];
  for (const word of words) {
    const move = readTypedMove(word, board, color);
    if (!move) return null;
    squares.push(`${move.from}${move.to}`);
    board = applyMove(board, move.from, move.to, move.promotion);
    color = color === 'w' ? 'b' : 'w';
  }
  return squares;
}

export type Side = 'either' | 'white' | 'black';
export type Outcome = 'all' | 'won' | 'drew' | 'lost';

export interface Filters {
  /** A player's name exactly, or part of one */
  player: string;
  side: Side;
  /** Won/drew/lost for the player (or for White, with no player) */
  outcome: Outcome;
  event: string;
  /** 2025-10-09, as an <input type=date> gives it; '' = no limit */
  from: string;
  to: string;
  /** Opening moves as typed */
  moves: string;
}

export const NO_FILTERS: Filters = { player: '', side: 'either', outcome: 'all', event: '', from: '', to: '', moves: '' };

/** How the game went for White: 1 won, 0.5 drew, 0 lost, null unfinished. */
export function whiteScore(result: string): number | null {
  if (result === '1-0') return 1;
  if (result === '0-1') return 0;
  if (result === '1/2-1/2') return 0.5;
  return null;
}

/** The side the player had in this game, or null if they didn't play in it. */
export function sideOf(summary: GameSummary, player: string, exact: boolean): 'white' | 'black' | null {
  const has = (name: string) => (exact ? name === player : name.toLowerCase().includes(player.toLowerCase()));
  if (has(summary.white)) return 'white';
  if (has(summary.black)) return 'black';
  return null;
}

export function filterGames(games: LibraryGame[], filters: Filters, names: Set<string>): LibraryGame[] {
  const player = filters.player.trim();
  const exact = names.has(player);
  const line = filters.moves.trim() ? readTypedLine(filters.moves) : [];
  const lineText = line?.join(' ') ?? null;
  const from = filters.from.replace(/-/g, '.');
  const to = filters.to.replace(/-/g, '.');
  return games.filter(({ summary }) => {
    let side: 'white' | 'black' | null = null;
    if (player) {
      side = sideOf(summary, player, exact);
      if (!side) return false;
    }
    if (filters.side !== 'either') {
      if (player ? side !== filters.side : false) return false;
    }
    if (filters.outcome !== 'all') {
      const white = whiteScore(summary.result);
      if (white === null) return false;
      const score = (side ?? (filters.side === 'black' ? 'black' : 'white')) === 'white' ? white : 1 - white;
      const want = filters.outcome === 'won' ? 1 : filters.outcome === 'drew' ? 0.5 : 0;
      if (score !== want) return false;
    }
    if (filters.event && summary.event !== filters.event) return false;
    if (from && summary.date < from) return false;
    if (to && summary.date > to) return false;
    if (lineText === null) return false;
    if (lineText && !(summary.startSquares + ' ').startsWith(lineText + ' ')) return false;
    return true;
  });
}

/** +W =D −L for a player over these games (only games they played and that finished). */
export function score(games: LibraryGame[], player: string): { won: number; drew: number; lost: number } {
  const totals = { won: 0, drew: 0, lost: 0 };
  for (const { summary } of games) {
    const side = sideOf(summary, player, true);
    const white = whiteScore(summary.result);
    if (!side || white === null) continue;
    const s = side === 'white' ? white : 1 - white;
    if (s === 1) totals.won++;
    else if (s === 0) totals.lost++;
    else totals.drew++;
  }
  return totals;
}

/** "1.e4 c5 2.Nf3 d6" from the stored first moves. */
export function numbered(start: string, plies = 8): string {
  return start
    .split(' ')
    .filter(Boolean)
    .slice(0, plies)
    .map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}.${san}` : san))
    .join(' ');
}
