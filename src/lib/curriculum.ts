import { getPuzzlesForPiece } from '$lib/puzzles';
import { getPuzzleProgress } from '$lib/state/progress-store';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type ProgressSource =
  | { type: 'puzzle-set'; key: string }
  | { type: 'localStorage'; key: string }
  | { type: 'localStorage-all'; keys: string[] }
  | { type: 'none' };

export interface CurriculumStop {
  id: string;
  name: string;
  icon: string;
  href: string;
  progress: ProgressSource;
}

export interface CurriculumChapter {
  id: string;
  title: string;
  stops: CurriculumStop[];
}

// ═══════════════════════════════════════════════
// Curriculum data
// ═══════════════════════════════════════════════

const SETUP_SLUGS = ['rooks', 'knights', 'bishops', 'king', 'queen', 'pawns', 'full'];

export const CURRICULUM: CurriculumChapter[] = [
  // ── Ch 1: The Basics ─────────────────────────
  {
    id: 'basics',
    title: 'The Basics',
    stops: [
      { id: 'piece-rook', name: 'Rook', icon: '/pieces/wR.svg', href: '/learn/rook', progress: { type: 'puzzle-set', key: 'rook' } },
      { id: 'piece-bishop', name: 'Bishop', icon: '/pieces/wB.svg', href: '/learn/bishop', progress: { type: 'puzzle-set', key: 'bishop' } },
      { id: 'piece-queen', name: 'Queen', icon: '/pieces/wQ.svg', href: '/learn/queen', progress: { type: 'puzzle-set', key: 'queen' } },
      { id: 'piece-king', name: 'King', icon: '/pieces/wK.svg', href: '/learn/king', progress: { type: 'puzzle-set', key: 'king' } },
      { id: 'piece-knight', name: 'Knight', icon: '/pieces/wN.svg', href: '/learn/knight', progress: { type: 'puzzle-set', key: 'knight' } },
      { id: 'piece-pawn', name: 'Pawn', icon: '/pieces/wP.svg', href: '/learn/pawn', progress: { type: 'puzzle-set', key: 'pawn' } },
      { id: 'danger-zones', name: 'Danger Zones', icon: '/pieces/bQ.svg', href: '/learn/danger-zones', progress: { type: 'puzzle-set', key: 'danger-zones' } },
      { id: 'board-setup', name: 'Place the Pieces', icon: '/pieces/wR.svg', href: '/setup', progress: { type: 'localStorage-all', keys: SETUP_SLUGS.map(s => `setup-${s}-best-stars`) } },
      { id: 'board-coords', name: 'Name the Square', icon: '/pieces/wK.svg', href: '/board/coordinates', progress: { type: 'localStorage', key: 'coord-best-stars' } },
      { id: 'how-to-win', name: 'How to Win', icon: '/pieces/wK.svg', href: '/learn/how-to-win', progress: { type: 'localStorage', key: 'how-to-win-best-stars' } },
      { id: 'mate-in-1', name: 'Mate in 1', icon: '/pieces/wQ.svg', href: '/learn/checkmate-mate-in-1', progress: { type: 'puzzle-set', key: 'checkmate-mate-in-1' } },
      { id: 'play-random', name: 'Play vs Random Bot', icon: '/pieces/wN.svg', href: '/play?level=random', progress: { type: 'none' } },
    ],
  },

  // ── Ch 2: First Checkmates ───────────────────
  {
    id: 'first-checkmates',
    title: 'First Checkmates',
    stops: [
      { id: 'endings-kqk', name: 'Queen vs King', icon: '/pieces/wQ.svg', href: '/learn/endings-kqk', progress: { type: 'localStorage', key: 'endings-kqk-best-stars' } },
      { id: 'endings-krrk', name: 'Two Rooks vs King', icon: '/pieces/wR.svg', href: '/learn/endings-krrk', progress: { type: 'localStorage', key: 'endings-krrk-best-stars' } },
    ],
  },

  // ── Ch 3: The Moves ──────────────────────────
  {
    id: 'the-moves',
    title: 'The Moves',
    stops: [
      { id: 'opening-scholars', name: "Scholar's Mate", icon: '/pieces/wQ.svg', href: '/openings/scholars-mate', progress: { type: 'none' } },
    ],
  },

  // ── Ch 4: Checkmate Patterns ─────────────────
  {
    id: 'checkmate-patterns',
    title: 'Checkmate Patterns',
    stops: [
      { id: 'cm-back-rank', name: 'Back Rank', icon: '/pieces/wR.svg', href: '/learn/checkmate-back-rank', progress: { type: 'puzzle-set', key: 'checkmate-back-rank' } },
      { id: 'cm-rook-ladder', name: 'Rook Ladder', icon: '/pieces/wR.svg', href: '/learn/checkmate-rook-ladder', progress: { type: 'puzzle-set', key: 'checkmate-rook-ladder' } },
      { id: 'cm-queen-f7', name: 'Queen Takes f7', icon: '/pieces/wQ.svg', href: '/learn/checkmate-queen-f7', progress: { type: 'puzzle-set', key: 'checkmate-queen-f7' } },
      { id: 'cm-qb-battery', name: 'QB Battery', icon: '/pieces/wQ.svg', href: '/learn/checkmate-qb-battery', progress: { type: 'puzzle-set', key: 'checkmate-qb-battery' } },
      { id: 'cm-lollis', name: "Lolli's Mate", icon: '/pieces/wQ.svg', href: '/learn/checkmate-lollis', progress: { type: 'puzzle-set', key: 'checkmate-lollis' } },
      { id: 'cm-queen-king', name: 'Queen & King', icon: '/pieces/wQ.svg', href: '/learn/checkmate-queen-king', progress: { type: 'puzzle-set', key: 'checkmate-queen-king' } },
      { id: 'cm-smothered', name: 'Smothered Mate', icon: '/pieces/wN.svg', href: '/learn/checkmate-smothered', progress: { type: 'puzzle-set', key: 'checkmate-smothered' } },
      { id: 'mate-in-2', name: 'Mate in 2', icon: '/pieces/wQ.svg', href: '/learn/checkmate-mate-in-2', progress: { type: 'puzzle-set', key: 'checkmate-mate-in-2' } },
    ],
  },

  // ── Ch 5: The Tactics ────────────────────────
  {
    id: 'tactics',
    title: 'The Tactics',
    stops: [
      { id: 'tactics-pins', name: 'Pins', icon: '/pieces/wB.svg', href: '/learn/tactics-pins', progress: { type: 'puzzle-set', key: 'tactics-pins' } },
      { id: 'tactics-forks', name: 'Forks', icon: '/pieces/wN.svg', href: '/learn/tactics-forks', progress: { type: 'puzzle-set', key: 'tactics-forks' } },
      { id: 'tactics-skewers', name: 'Skewers', icon: '/pieces/wR.svg', href: '/learn/tactics-skewers', progress: { type: 'puzzle-set', key: 'tactics-skewers' } },
      { id: 'tactics-removing-defender', name: 'Removing Defender', icon: '/pieces/wR.svg', href: '/learn/tactics-removing-defender', progress: { type: 'puzzle-set', key: 'tactics-removing-defender' } },
      { id: 'tactics-discovered', name: 'Discovered Attacks', icon: '/pieces/wN.svg', href: '/learn/tactics-discovered', progress: { type: 'puzzle-set', key: 'tactics-discovered' } },
    ],
  },

  // ── Ch 6: Pawn Endings ───────────────────────
  {
    id: 'pawn-endings',
    title: 'Pawn Endings',
    stops: [
      { id: 'pawn-endings-lesson', name: 'Opposition', icon: '/pieces/wK.svg', href: '/learn/pawn-endings-lesson', progress: { type: 'localStorage', key: 'pawn-endings-lesson-best-stars' } },
      { id: 'endings-kpk', name: 'King + Pawn vs King', icon: '/pieces/wP.svg', href: '/learn/endings-kpk', progress: { type: 'none' } },
    ],
  },

  // ── Ch 7: Harder Checkmates ──────────────────
  {
    id: 'harder-mates',
    title: 'Harder Checkmates',
    stops: [
      { id: 'endings-krk', name: 'Rook vs King', icon: '/pieces/wR.svg', href: '/learn/endings-krk', progress: { type: 'localStorage', key: 'endings-krk-best-stars' } },
    ],
  },

  // ── Ch 8: Expert Checkmates ──────────────────
  {
    id: 'expert-mates',
    title: 'Expert Checkmates',
    stops: [
      { id: 'endings-kbbk', name: 'Two Bishops vs King', icon: '/pieces/wB.svg', href: '/learn/endings-kbbk', progress: { type: 'localStorage', key: 'endings-kbbk-best-stars' } },
      { id: 'endings-kbnk', name: 'Bishop + Knight', icon: '/pieces/wN.svg', href: '/learn/endings-kbnk', progress: { type: 'localStorage', key: 'endings-kbnk-best-stars' } },
    ],
  },

  // ── Ch 9: Board Vision ───────────────────────
  {
    id: 'board-vision',
    title: 'Board Vision',
    stops: [
      { id: 'vision-color', name: 'Color of Square', icon: '/pieces/wP.svg', href: '/vision/color', progress: { type: 'localStorage', key: 'blindfold-color-best-stars' } },
      { id: 'vision-rankfile', name: 'Same Rank/File', icon: '/pieces/wR.svg', href: '/vision/rankfile', progress: { type: 'localStorage', key: 'blindfold-rankfile-best-stars' } },
      { id: 'vision-diagonals', name: 'Same Diagonal', icon: '/pieces/wB.svg', href: '/vision/diagonals', progress: { type: 'localStorage', key: 'blindfold-diagonal-best-stars' } },
      { id: 'vision-neighbors', name: 'Neighbor Squares', icon: '/pieces/wK.svg', href: '/vision/neighbors', progress: { type: 'localStorage', key: 'blindfold-neighbors-best-stars' } },
      { id: 'vision-counting', name: 'Move Counting', icon: '/pieces/wQ.svg', href: '/vision/counting', progress: { type: 'localStorage', key: 'blindfold-counting-best-stars' } },
      { id: 'vision-reachability', name: 'Piece Reachability', icon: '/pieces/wN.svg', href: '/vision/reachability', progress: { type: 'localStorage', key: 'blindfold-reachability-best-stars' } },
      { id: 'vision-knightsquares', name: 'Knight Squares', icon: '/pieces/wN.svg', href: '/vision/knightsquares', progress: { type: 'localStorage', key: 'blindfold-knightsquares-best-stars' } },
      { id: 'vision-relative', name: 'Relative Position', icon: '/pieces/wP.svg', href: '/vision/relative', progress: { type: 'localStorage', key: 'blindfold-relative-best-stars' } },
    ],
  },

  // ── Ch 10: Routes ────────────────────────────
  {
    id: 'routes',
    title: 'Routes',
    stops: [
      { id: 'vision-knight-routes', name: 'Knight Routes', icon: '/pieces/wN.svg', href: '/vision/knight-routes', progress: { type: 'none' } },
      { id: 'vision-bishop-routes', name: 'Bishop Routes', icon: '/pieces/wB.svg', href: '/vision/bishop-routes', progress: { type: 'none' } },
      { id: 'vision-rookmaze', name: 'Rook Maze', icon: '/pieces/wR.svg', href: '/vision/rookmaze', progress: { type: 'none' } },
      { id: 'vision-gauntlet', name: 'Knight Gauntlet', icon: '/pieces/wN.svg', href: '/vision/gauntlet', progress: { type: 'none' } },
    ],
  },

  // ── Ch 11: Memory ────────────────────────────
  {
    id: 'memory',
    title: 'Memory',
    stops: [
      { id: 'vision-changed', name: 'What Changed?', icon: '/pieces/wR.svg', href: '/vision/changed', progress: { type: 'localStorage', key: 'blindfold-changed-best-stars' } },
      { id: 'vision-landed', name: 'Where Did It Land?', icon: '/pieces/wN.svg', href: '/vision/landed', progress: { type: 'localStorage', key: 'blindfold-landed-best-stars' } },
      { id: 'vision-flash', name: 'Flash Position', icon: '/pieces/wK.svg', href: '/vision/flash', progress: { type: 'localStorage', key: 'blindfold-flash-best-stars' } },
      { id: 'vision-piececount', name: 'Piece Count', icon: '/pieces/wP.svg', href: '/vision/piececount', progress: { type: 'localStorage', key: 'blindfold-piececount-best-stars' } },
    ],
  },

  // ── Ch 12: Mastery ───────────────────────────
  {
    id: 'mastery',
    title: 'Mastery',
    stops: [
      { id: 'vision-blindtactics', name: 'Blind Tactics', icon: '/pieces/wQ.svg', href: '/vision/blindtactics', progress: { type: 'localStorage', key: 'blindfold-blindtactics-best-stars' } },
      { id: 'vision-puzzle', name: 'Blindfold Puzzles', icon: '/pieces/wK.svg', href: '/vision/puzzle', progress: { type: 'localStorage', key: 'blindfold-puzzle-best-stars' } },
      { id: 'vision-guarding', name: "Who's Guarding?", icon: '/pieces/wQ.svg', href: '/vision/guarding', progress: { type: 'localStorage', key: 'blindfold-guarding-best-stars' } },
      { id: 'bf-mate-kqk', name: 'BF Mate: Q vs K', icon: '/pieces/wQ.svg', href: '/vision/mate-kqk', progress: { type: 'localStorage', key: 'blindfold-mate-kqk-best-stars' } },
      { id: 'bf-mate-krrk', name: 'BF Mate: RR vs K', icon: '/pieces/wR.svg', href: '/vision/mate-krrk', progress: { type: 'localStorage', key: 'blindfold-mate-krrk-best-stars' } },
      { id: 'bf-mate-krk', name: 'BF Mate: R vs K', icon: '/pieces/wR.svg', href: '/vision/mate-krk', progress: { type: 'localStorage', key: 'blindfold-mate-krk-best-stars' } },
      { id: 'bf-mate-kbbk', name: 'BF Mate: BB vs K', icon: '/pieces/wB.svg', href: '/vision/mate-kbbk', progress: { type: 'localStorage', key: 'blindfold-mate-kbbk-best-stars' } },
      { id: 'bf-mate-kbnk', name: 'BF Mate: BN vs K', icon: '/pieces/wN.svg', href: '/vision/mate-kbnk', progress: { type: 'localStorage', key: 'blindfold-mate-kbnk-best-stars' } },
    ],
  },
];

// ═══════════════════════════════════════════════
// Progress helpers
// ═══════════════════════════════════════════════

/** Get the star rating for a single stop (0 = incomplete, 1-3 = stars earned) */
export function getStopStars(stop: CurriculumStop): number {
  const src = stop.progress;
  switch (src.type) {
    case 'puzzle-set': {
      const set = getPuzzlesForPiece(src.key);
      if (!set) return 0;
      let minStars = Infinity;
      for (const p of set.puzzles) {
        const prog = getPuzzleProgress(p.id);
        if (!prog?.completed) return 0;
        minStars = Math.min(minStars, prog.bestStars);
      }
      return minStars === Infinity ? 0 : minStars;
    }
    case 'localStorage': {
      return parseInt(localStorage.getItem(src.key) ?? '0', 10);
    }
    case 'localStorage-all': {
      let min = Infinity;
      for (const key of src.keys) {
        const val = parseInt(localStorage.getItem(key) ?? '0', 10);
        if (val === 0) return 0;
        min = Math.min(min, val);
      }
      return min === Infinity ? 0 : min;
    }
    case 'none':
      return 0;
  }
}

/** Get stars for all stops. Reads from puzzle progress store + localStorage. */
export function getAllStopStars(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const chapter of CURRICULUM) {
    for (const stop of chapter.stops) {
      result[stop.id] = getStopStars(stop);
    }
  }
  return result;
}

/** Find the first incomplete stop (skips 'none'-type stops). Returns the stop id or null. */
export function getFirstIncompleteId(stopStars: Record<string, number>): string | null {
  for (const chapter of CURRICULUM) {
    for (const stop of chapter.stops) {
      if (stop.progress.type === 'none') continue;
      if ((stopStars[stop.id] ?? 0) === 0) return stop.id;
    }
  }
  return null;
}

/** Find the first incomplete stop and return its info for the Continue button. */
export function getFirstIncompleteStop(stopStars: Record<string, number>): { id: string; name: string; href: string } | null {
  const id = getFirstIncompleteId(stopStars);
  if (!id) return null;
  for (const chapter of CURRICULUM) {
    for (const stop of chapter.stops) {
      if (stop.id === id) return { id: stop.id, name: stop.name, href: stop.href };
    }
  }
  return null;
}
