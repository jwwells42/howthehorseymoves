import { getPuzzlesForPiece } from '$lib/puzzles';
import { getPuzzleProgress } from '$lib/state/progress-store';
import { readNumber } from '$lib/state/storage';

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
  // ── Level 1: The Foal (9) ────────────────
  {
    id: 'the-foal',
    title: 'Level 1: The Foal',
    stops: [
      { id: 'piece-rook', name: 'Rook', icon: '/pieces/wR.svg', href: '/learn/rook', progress: { type: 'puzzle-set', key: 'rook' } },
      { id: 'piece-bishop', name: 'Bishop', icon: '/pieces/wB.svg', href: '/learn/bishop', progress: { type: 'puzzle-set', key: 'bishop' } },
      { id: 'piece-queen', name: 'Queen', icon: '/pieces/wQ.svg', href: '/learn/queen', progress: { type: 'puzzle-set', key: 'queen' } },
      { id: 'piece-king', name: 'King', icon: '/pieces/wK.svg', href: '/learn/king', progress: { type: 'puzzle-set', key: 'king' } },
      { id: 'piece-knight', name: 'Knight', icon: '/pieces/wN.svg', href: '/learn/knight', progress: { type: 'puzzle-set', key: 'knight' } },
      { id: 'piece-pawn', name: 'Pawn', icon: '/pieces/wP.svg', href: '/learn/pawn', progress: { type: 'puzzle-set', key: 'pawn' } },
      { id: 'match-moves', name: 'Match the Moves', icon: '/pieces/wQ.svg', href: '/learn/match-moves', progress: { type: 'localStorage', key: 'match-moves-best-stars' } },
      { id: 'how-to-win', name: 'How to Win', icon: '/pieces/wK.svg', href: '/learn/how-to-win', progress: { type: 'localStorage', key: 'how-to-win-best-stars' } },
      { id: 'play-random', name: 'Play the Sloth', icon: '/pieces/wN.svg', href: '/play?level=random', progress: { type: 'localStorage', key: 'bot-beaten-random' } },
    ],
  },

  // ── Level 2: The Colt (9) ────────────────
  {
    id: 'the-colt',
    title: 'Level 2: The Colt',
    stops: [
      { id: 'board-setup', name: 'Place the Pieces', icon: '/pieces/wR.svg', href: '/setup', progress: { type: 'localStorage-all', keys: SETUP_SLUGS.map(s => `setup-${s}-best-stars`) } },
      { id: 'danger-zones', name: 'Danger Zones', icon: '/pieces/bQ.svg', href: '/learn/danger-zones', progress: { type: 'puzzle-set', key: 'danger-zones' } },
      { id: 'board-coords', name: 'Name the Square', icon: '/pieces/wK.svg', href: '/board/coordinates', progress: { type: 'localStorage', key: 'coord-best-stars' } },
      { id: 'mate-in-1', name: 'Mate in 1', icon: '/pieces/wQ.svg', href: '/learn/checkmate-mate-in-1', progress: { type: 'puzzle-set', key: 'checkmate-mate-in-1' } },
      { id: 'endings-kqk', name: 'Queen vs King', icon: '/pieces/wQ.svg', href: '/learn/endings-kqk', progress: { type: 'localStorage', key: 'endings-kqk-best-stars' } },
      { id: 'cm-back-rank', name: 'Back Rank', icon: '/pieces/wR.svg', href: '/learn/checkmate-back-rank', progress: { type: 'puzzle-set', key: 'checkmate-back-rank' } },
      { id: 'cm-rook-ladder', name: 'Rook Ladder', icon: '/pieces/wR.svg', href: '/learn/checkmate-rook-ladder', progress: { type: 'puzzle-set', key: 'checkmate-rook-ladder' } },
      { id: 'endings-krrk', name: '2 Rooks vs King', icon: '/pieces/wR.svg', href: '/learn/endings-krrk', progress: { type: 'localStorage', key: 'endings-krrk-best-stars' } },
      { id: 'play-greedy', name: 'Play the Chick', icon: '/pieces/wN.svg', href: '/play?level=greedy', progress: { type: 'localStorage', key: 'bot-beaten-greedy' } },
    ],
  },

  // ── The spiral: from here each level has one of each kind (an opening,
  // a pattern, an ending, a model game; vision from Level 9), then its bot.
  // Levels 9 and up are titled by number until the teacher names them.

  // ── Level 3: The Trotter (5) ───────────
  {
    id: 'the-trotter',
    title: 'Level 3: The Trotter',
    stops: [
      { id: 'opening-scholars', name: "Scholar's Mate", icon: '/pieces/wQ.svg', href: '/openings/scholars-mate', progress: { type: 'none' } },
      { id: 'cm-lollis', name: "Lolli's Mate", icon: '/pieces/wQ.svg', href: '/learn/checkmate-lollis', progress: { type: 'puzzle-set', key: 'checkmate-lollis' } },
      { id: 'endings-krk', name: 'Rook vs King', icon: '/pieces/wR.svg', href: '/learn/endings-krk', progress: { type: 'localStorage', key: 'endings-krk-best-stars' } },
      { id: 'game-fools-mate', name: "Fool's Mate", icon: '/pieces/bQ.svg', href: '/games/fools-mate', progress: { type: 'none' } },
      { id: 'play-wild', name: 'Play the Pig', icon: '/pieces/wN.svg', href: '/play?level=wild', progress: { type: 'localStorage', key: 'bot-beaten-wild' } },
    ],
  },

  // ── Level 4: The Cantering (5) ─────────
  {
    id: 'the-cantering',
    title: 'Level 4: The Cantering',
    stops: [
      { id: 'opening-e4', name: '1.e4', icon: '/pieces/wP.svg', href: '/openings/first-e4', progress: { type: 'none' } },
      { id: 'tactics-pins', name: 'Pins', icon: '/pieces/wB.svg', href: '/learn/tactics-pins', progress: { type: 'puzzle-set', key: 'tactics-pins' } },
      { id: 'pawn-endings-lesson', name: 'Pawn Endings', icon: '/pieces/wK.svg', href: '/learn/pawn-endings-lesson', progress: { type: 'localStorage', key: 'pawn-endings-lesson-best-stars' } },
      { id: 'game-legal', name: "Legal's Mate", icon: '/pieces/wN.svg', href: '/games/legal-mate', progress: { type: 'none' } },
      { id: 'play-loose', name: 'Play the Frog', icon: '/pieces/wN.svg', href: '/play?level=loose', progress: { type: 'localStorage', key: 'bot-beaten-loose' } },
    ],
  },

  // ── Level 5: The Galloper (5) ──────────
  {
    id: 'the-galloper',
    title: 'Level 5: The Galloper',
    stops: [
      { id: 'opening-e4-e5', name: '1.e4 e5', icon: '/pieces/bP.svg', href: '/openings/first-e4-e5', progress: { type: 'none' } },
      { id: 'cm-queen-f7', name: 'Queen Takes f7', icon: '/pieces/wQ.svg', href: '/learn/checkmate-queen-f7', progress: { type: 'puzzle-set', key: 'checkmate-queen-f7' } },
      { id: 'pawn-endings-practice', name: 'Pawn Ending Practice', icon: '/pieces/wP.svg', href: '/learn/pawn-endings-practice', progress: { type: 'puzzle-set', key: 'pawn-endings-practice' } },
      { id: 'game-budapest', name: 'Budapest Smothered', icon: '/pieces/bN.svg', href: '/games/budapest-smothered', progress: { type: 'none' } },
      { id: 'play-steady', name: 'Play the Duck', icon: '/pieces/wN.svg', href: '/play?level=steady', progress: { type: 'localStorage', key: 'bot-beaten-steady' } },
    ],
  },

  // ── Level 6: The Destrier (5) ──────────
  {
    id: 'the-destrier',
    title: 'Level 6: The Destrier',
    stops: [
      { id: 'opening-d4-d5', name: '1.d4 d5', icon: '/pieces/bP.svg', href: '/openings/first-d4-d5', progress: { type: 'none' } },
      { id: 'tactics-forks', name: 'Forks', icon: '/pieces/wN.svg', href: '/learn/tactics-forks', progress: { type: 'puzzle-set', key: 'tactics-forks' } },
      { id: 'endings-kpk', name: 'King + Pawn vs King', icon: '/pieces/wP.svg', href: '/learn/endings-kpk', progress: { type: 'localStorage', key: 'endings-kpk-best-stars' } },
      { id: 'game-greco-smothered', name: "Greco's Smothered", icon: '/pieces/bN.svg', href: '/games/greco-smothered', progress: { type: 'none' } },
      { id: 'play-careful', name: 'Play the Rabbit', icon: '/pieces/wN.svg', href: '/play?level=careful', progress: { type: 'localStorage', key: 'bot-beaten-careful' } },
    ],
  },

  // ── Level 7: The Stallion (4) ──────────
  {
    id: 'the-stallion',
    title: 'Level 7: The Stallion',
    stops: [
      { id: 'cm-qb-battery', name: 'QB Battery', icon: '/pieces/wQ.svg', href: '/learn/checkmate-qb-battery', progress: { type: 'puzzle-set', key: 'checkmate-qb-battery' } },
      { id: 'endings-pawn-races', name: 'Pawn Races', icon: '/pieces/wP.svg', href: '/learn/endings-pawn-races', progress: { type: 'puzzle-set', key: 'endings-pawn-races' } },
      { id: 'game-opera', name: 'The Opera Game', icon: '/pieces/wQ.svg', href: '/games/opera', progress: { type: 'none' } },
      { id: 'play-tidy', name: 'Play the Penguin', icon: '/pieces/wN.svg', href: '/play?level=tidy', progress: { type: 'localStorage', key: 'bot-beaten-tidy' } },
    ],
  },

  // ── Level 8: The Charger (4) ───────────
  {
    id: 'the-charger',
    title: 'Level 8: The Charger',
    stops: [
      { id: 'tactics-skewers', name: 'Skewers', icon: '/pieces/wR.svg', href: '/learn/tactics-skewers', progress: { type: 'puzzle-set', key: 'tactics-skewers' } },
      { id: 'endings-reti', name: 'Réti Study', icon: '/pieces/wK.svg', href: '/learn/endings-reti', progress: { type: 'puzzle-set', key: 'endings-reti' } },
      { id: 'game-greco-gift', name: "Greco's Greek Gift", icon: '/pieces/wB.svg', href: '/games/greco-greek-gift', progress: { type: 'none' } },
      { id: 'play-basic', name: 'Play the Panda', icon: '/pieces/wN.svg', href: '/play?level=basic', progress: { type: 'localStorage', key: 'bot-beaten-basic' } },
    ],
  },

  // ── Level 9 (6) ────────────────────────
  {
    id: 'level-9',
    title: 'Level 9',
    stops: [
      { id: 'cm-queen-king', name: 'Queen & King', icon: '/pieces/wQ.svg', href: '/learn/checkmate-queen-king', progress: { type: 'puzzle-set', key: 'checkmate-queen-king' } },
      { id: 'endings-kbbk', name: 'Two Bishops vs King', icon: '/pieces/wB.svg', href: '/learn/endings-kbbk', progress: { type: 'localStorage', key: 'endings-kbbk-best-stars' } },
      { id: 'game-greco-mate', name: "Greco's Mate", icon: '/pieces/wN.svg', href: '/games/greco-mate', progress: { type: 'none' } },
      { id: 'vision-color', name: 'Color of Square', icon: '/pieces/wP.svg', href: '/vision/color', progress: { type: 'localStorage', key: 'blindfold-color-best-stars' } },
      { id: 'vision-diagonals', name: 'Same Diagonal', icon: '/pieces/wB.svg', href: '/vision/diagonals', progress: { type: 'localStorage', key: 'blindfold-diagonal-best-stars' } },
      { id: 'play-bold', name: 'Play the Goat', icon: '/pieces/bN.svg', href: '/play?level=bold', progress: { type: 'localStorage', key: 'bot-beaten-bold' } },
    ],
  },

  // ── Level 10 (6) ───────────────────────
  {
    id: 'level-10',
    title: 'Level 10',
    stops: [
      { id: 'tactics-removing-defender', name: 'Removing Defender', icon: '/pieces/wR.svg', href: '/learn/tactics-removing-defender', progress: { type: 'puzzle-set', key: 'tactics-removing-defender' } },
      { id: 'endings-kbnk', name: 'Bishop + Knight', icon: '/pieces/wN.svg', href: '/learn/endings-kbnk', progress: { type: 'localStorage', key: 'endings-kbnk-best-stars' } },
      { id: 'game-immortal', name: 'The Immortal Game', icon: '/pieces/wB.svg', href: '/games/immortal', progress: { type: 'none' } },
      { id: 'vision-counting', name: 'Move Counting', icon: '/pieces/wQ.svg', href: '/vision/counting', progress: { type: 'localStorage', key: 'blindfold-counting-best-stars' } },
      { id: 'vision-changed', name: 'What Changed?', icon: '/pieces/wR.svg', href: '/vision/changed', progress: { type: 'localStorage', key: 'blindfold-changed-best-stars' } },
      { id: 'play-sharp', name: 'Play the Monkey', icon: '/pieces/bN.svg', href: '/play?level=sharp', progress: { type: 'localStorage', key: 'bot-beaten-sharp' } },
    ],
  },

  // ── Level 11 (6) ───────────────────────
  {
    id: 'level-11',
    title: 'Level 11',
    stops: [
      { id: 'cm-smothered', name: 'Smothered Mate', icon: '/pieces/wN.svg', href: '/learn/checkmate-smothered', progress: { type: 'puzzle-set', key: 'checkmate-smothered' } },
      { id: 'endings-wrong-bishop', name: 'Wrong Bishop', icon: '/pieces/wB.svg', href: '/learn/endings-wrong-bishop', progress: { type: 'localStorage', key: 'draw-wrong-bishop-best-stars' } },
      { id: 'game-rubinstein', name: "Rubinstein's Immortal", icon: '/pieces/bQ.svg', href: '/games/rubinstein-immortal', progress: { type: 'none' } },
      { id: 'vision-landed', name: 'Where Did It Land?', icon: '/pieces/wN.svg', href: '/vision/landed', progress: { type: 'localStorage', key: 'blindfold-landed-best-stars' } },
      { id: 'vision-flash', name: 'Flash Position', icon: '/pieces/wK.svg', href: '/vision/flash', progress: { type: 'localStorage', key: 'blindfold-flash-best-stars' } },
      { id: 'play-keen', name: 'Play the Gorilla', icon: '/pieces/bN.svg', href: '/play?level=keen', progress: { type: 'localStorage', key: 'bot-beaten-keen' } },
    ],
  },

  // ── Level 12 (6) ───────────────────────
  {
    id: 'level-12',
    title: 'Level 12',
    stops: [
      { id: 'tactics-discovered', name: 'Discovered Attacks', icon: '/pieces/wN.svg', href: '/learn/tactics-discovered', progress: { type: 'puzzle-set', key: 'tactics-discovered' } },
      { id: 'endings-lucena', name: 'Lucena Position', icon: '/pieces/wR.svg', href: '/learn/endings-lucena', progress: { type: 'puzzle-set', key: 'endings-lucena' } },
      { id: 'game-gold-coins', name: 'Gold Coins Game', icon: '/pieces/bQ.svg', href: '/games/gold-coins', progress: { type: 'none' } },
      { id: 'vision-knight-routes', name: 'Knight Routes', icon: '/pieces/wN.svg', href: '/vision/knight-routes', progress: { type: 'none' } },
      { id: 'vision-gauntlet', name: 'Knight Gauntlet', icon: '/pieces/wN.svg', href: '/vision/gauntlet', progress: { type: 'none' } },
      { id: 'play-intermediate', name: 'Play the Bear', icon: '/pieces/bN.svg', href: '/play?level=intermediate', progress: { type: 'localStorage', key: 'bot-beaten-intermediate' } },
    ],
  },

  // ── Level 13 (6) ───────────────────────
  {
    id: 'level-13',
    title: 'Level 13',
    stops: [
      { id: 'mate-in-2', name: 'Mate in 2', icon: '/pieces/wQ.svg', href: '/learn/checkmate-mate-in-2', progress: { type: 'puzzle-set', key: 'checkmate-mate-in-2' } },
      { id: 'endings-philidor', name: 'Philidor Position', icon: '/pieces/wR.svg', href: '/learn/endings-philidor', progress: { type: 'localStorage', key: 'draw-philidor-best-stars' } },
      { id: 'game-century', name: 'Game of the Century', icon: '/pieces/bN.svg', href: '/games/game-of-century', progress: { type: 'none' } },
      { id: 'vision-blindtactics', name: 'Blind Tactics', icon: '/pieces/wQ.svg', href: '/vision/blindtactics', progress: { type: 'localStorage', key: 'blindfold-blindtactics-best-stars' } },
      { id: 'vision-guarding', name: "Who's Guarding?", icon: '/pieces/wQ.svg', href: '/vision/guarding', progress: { type: 'localStorage', key: 'blindfold-guarding-best-stars' } },
      { id: 'play-booked', name: 'Play the Elephant', icon: '/pieces/bN.svg', href: '/play?level=booked', progress: { type: 'localStorage', key: 'bot-beaten-booked' } },
    ],
  },

  // ── Level 14 (4) ───────────────────────
  {
    id: 'level-14',
    title: 'Level 14',
    stops: [
      { id: 'endings-kpk-draw', name: 'KPK: Defend', icon: '/pieces/bK.svg', href: '/learn/endings-kpk-draw', progress: { type: 'localStorage', key: 'draw-kpk-best-stars' } },
      { id: 'game-capablanca', name: 'Capablanca vs Bernstein', icon: '/pieces/wN.svg', href: '/games/capablanca-bernstein', progress: { type: 'none' } },
      { id: 'bf-mate-kqk', name: 'Blindfold Mate', icon: '/pieces/wQ.svg', href: '/vision/mate-kqk', progress: { type: 'localStorage', key: 'blindfold-mate-kqk-best-stars' } },
      { id: 'play-expert', name: 'Play the Owl', icon: '/pieces/bN.svg', href: '/play?level=expert', progress: { type: 'localStorage', key: 'bot-beaten-expert' } },
    ],
  },
];

// ═══════════════════════════════════════════════
// Progress helpers
// ═══════════════════════════════════════════════

/** A puzzle set's stars: the fewest stars on any of its puzzles, 0 until every one is done */
export function getPuzzleSetStars(key: string): number {
  const set = getPuzzlesForPiece(key);
  if (!set) return 0;
  let minStars = Infinity;
  for (const p of set.puzzles) {
    const prog = getPuzzleProgress(p.id);
    if (!prog?.completed) return 0;
    minStars = Math.min(minStars, prog.bestStars);
  }
  return minStars === Infinity ? 0 : minStars;
}

/** Get the star rating for a single stop (0 = incomplete, 1-3 = stars earned) */
export function getStopStars(stop: CurriculumStop): number {
  const src = stop.progress;
  switch (src.type) {
    case 'puzzle-set':
      return getPuzzleSetStars(src.key);
    case 'localStorage': {
      return readNumber(src.key);
    }
    case 'localStorage-all': {
      let min = Infinity;
      for (const key of src.keys) {
        const val = readNumber(key);
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

/** The stop that follows the given one, crossing into the next chapter.
 *  Returns null at the very end of the curriculum. */
export function getNextStopAfter(stopId: string): CurriculumStop | null {
  const all = CURRICULUM.flatMap(c => c.stops);
  const i = all.findIndex(s => s.id === stopId);
  if (i === -1 || i === all.length - 1) return null;
  return all[i + 1];
}

/** Find the first incomplete stop and return its info for the Continue button.
 *  For puzzle-set stops, links directly to the first incomplete puzzle. */
export function getFirstIncompleteStop(stopStars: Record<string, number>): { id: string; name: string; href: string } | null {
  const id = getFirstIncompleteId(stopStars);
  if (!id) return null;
  for (const chapter of CURRICULUM) {
    for (const stop of chapter.stops) {
      if (stop.id !== id) continue;
      return { id: stop.id, name: stop.name, href: withStop(getStopStartHref(stop), stop) };
    }
  }
  return null;
}

/** Where a stop starts. For a puzzle set that's its first unfinished puzzle,
 *  so a student lands on a board rather than a list. */
export function getStopStartHref(stop: CurriculumStop): string {
  if (stop.progress.type !== 'puzzle-set') return stop.href;
  const key = stop.progress.key;
  const firstIncomplete = getPuzzlesForPiece(key)?.puzzles.find(p => !getPuzzleProgress(p.id)?.completed);
  return firstIncomplete ? `/learn/${key}/${firstIncomplete.id}` : stop.href;
}

/** A stop by its id, with its chapter. */
export function findStop(id: string): { chapter: CurriculumChapter; stop: CurriculumStop } | null {
  for (const chapter of CURRICULUM) {
    const stop = chapter.stops.find(s => s.id === id);
    if (stop) return { chapter, stop };
  }
  return null;
}

// ═══════════════════════════════════════════════
// Progression mode
// ═══════════════════════════════════════════════
//
// A student who opens a stop from the path (the landing page, or the screen
// between stops) carries ?stop=<stop id> in the URL, and the activity passes
// it along as it moves from page to page. When it's there, finishing the
// activity offers Continue, which leads to /done/<stop id>: the screen that
// moves the knight on to the next stop, or up to the next level. The same
// activity opened from a hub or the nav bar has no ?stop and ends as it
// always has.

const STOP_PARAM = 'stop';

/** The stop this page was opened from, if it was opened from the path. */
export function stopFromUrl(url: URL): CurriculumStop | null {
  const id = url.searchParams.get(STOP_PARAM);
  return id ? (findStop(id)?.stop ?? null) : null;
}

/** A link that stays in progression mode: adds ?stop= when there's a stop. */
export function withStop(href: string, stop: CurriculumStop | null | undefined): string {
  if (!stop) return href;
  return `${href}${href.includes('?') ? '&' : '?'}${STOP_PARAM}=${stop.id}`;
}

/** The screen after finishing a stop on the path. */
export function doneHref(stop: CurriculumStop): string {
  return `/done/${stop.id}`;
}
