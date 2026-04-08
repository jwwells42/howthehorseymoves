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
  desc: string;
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
  // ── Level 1: The Foal (9) ──────────────────
  {
    id: 'the-foal',
    title: 'Level 1: The Foal',
    stops: [
      { id: 'piece-rook', name: 'Rook', desc: 'Moves in straight lines: up, down, left, right.', icon: '/pieces/wR.svg', href: '/learn/rook', progress: { type: 'puzzle-set', key: 'rook' } },
      { id: 'piece-bishop', name: 'Bishop', desc: 'Moves diagonally across the board.', icon: '/pieces/wB.svg', href: '/learn/bishop', progress: { type: 'puzzle-set', key: 'bishop' } },
      { id: 'piece-queen', name: 'Queen', desc: 'Moves like a rook and bishop combined.', icon: '/pieces/wQ.svg', href: '/learn/queen', progress: { type: 'puzzle-set', key: 'queen' } },
      { id: 'piece-king', name: 'King', desc: 'Moves one square in any direction.', icon: '/pieces/wK.svg', href: '/learn/king', progress: { type: 'puzzle-set', key: 'king' } },
      { id: 'piece-knight', name: 'Knight', desc: 'Moves in an L-shape and can jump over pieces.', icon: '/pieces/wN.svg', href: '/learn/knight', progress: { type: 'puzzle-set', key: 'knight' } },
      { id: 'piece-pawn', name: 'Pawn', desc: 'Moves forward, captures diagonally.', icon: '/pieces/wP.svg', href: '/learn/pawn', progress: { type: 'puzzle-set', key: 'pawn' } },
      { id: 'board-setup', name: 'Place the Pieces', desc: 'Learn where each piece goes on the board.', icon: '/pieces/wR.svg', href: '/setup', progress: { type: 'localStorage-all', keys: SETUP_SLUGS.map(s => `setup-${s}-best-stars`) } },
      { id: 'how-to-win', name: 'How to Win', desc: 'Learn check, checkmate, and stalemate.', icon: '/pieces/wK.svg', href: '/learn/how-to-win', progress: { type: 'localStorage', key: 'how-to-win-best-stars' } },
      { id: 'play-random', name: 'Play a Game!', desc: 'Use everything you\'ve learned against the Random Bot.', icon: '/pieces/wN.svg', href: '/play?level=random', progress: { type: 'none' } },
    ],
  },

  // ── Level 2: The Colt (9) ──────────────────
  {
    id: 'the-colt',
    title: 'Level 2: The Colt',
    stops: [
      { id: 'danger-zones', name: 'Danger Zones', desc: 'Dodge enemy pieces — reach the star without getting eaten!', icon: '/pieces/bQ.svg', href: '/learn/danger-zones', progress: { type: 'puzzle-set', key: 'danger-zones' } },
      { id: 'board-coords', name: 'Name the Square', desc: 'Learn the names of all 64 squares.', icon: '/pieces/wK.svg', href: '/board/coordinates', progress: { type: 'localStorage', key: 'coord-best-stars' } },
      { id: 'mate-in-1', name: 'Mate in 1', desc: 'Find the single move that delivers checkmate.', icon: '/pieces/wQ.svg', href: '/learn/checkmate-mate-in-1', progress: { type: 'puzzle-set', key: 'checkmate-mate-in-1' } },
      { id: 'endings-kqk', name: 'Queen vs King', desc: 'Deliver checkmate with King + Queen.', icon: '/pieces/wQ.svg', href: '/learn/endings-kqk', progress: { type: 'localStorage', key: 'endings-kqk-best-stars' } },
      { id: 'cm-back-rank', name: 'Back Rank', desc: 'Trap the king behind its own pawns.', icon: '/pieces/wR.svg', href: '/learn/checkmate-back-rank', progress: { type: 'puzzle-set', key: 'checkmate-back-rank' } },
      { id: 'cm-rook-ladder', name: 'Rook Ladder', desc: 'Two rooks push the king to the edge, then deliver mate.', icon: '/pieces/wR.svg', href: '/learn/checkmate-rook-ladder', progress: { type: 'puzzle-set', key: 'checkmate-rook-ladder' } },
      { id: 'cm-lollis', name: "Lolli's Mate", desc: 'Queen slips in behind the pawns for mate.', icon: '/pieces/wQ.svg', href: '/learn/checkmate-lollis', progress: { type: 'puzzle-set', key: 'checkmate-lollis' } },
      { id: 'cm-queen-f7', name: 'Queen Takes f7', desc: 'The queen strikes the weak f7 square.', icon: '/pieces/wQ.svg', href: '/learn/checkmate-queen-f7', progress: { type: 'puzzle-set', key: 'checkmate-queen-f7' } },
      { id: 'cm-qb-battery', name: 'QB Battery', desc: 'Queen and bishop team up on a diagonal.', icon: '/pieces/wQ.svg', href: '/learn/checkmate-qb-battery', progress: { type: 'puzzle-set', key: 'checkmate-qb-battery' } },
    ],
  },

  // ── Level 3: The Trotter (9) ───────────────
  {
    id: 'the-trotter',
    title: 'Level 3: The Trotter',
    stops: [
      { id: 'cm-queen-king', name: 'Queen & King', desc: 'Use the queen with king support.', icon: '/pieces/wQ.svg', href: '/learn/checkmate-queen-king', progress: { type: 'puzzle-set', key: 'checkmate-queen-king' } },
      { id: 'cm-smothered', name: 'Smothered Mate', desc: 'The knight strikes when the king can\'t move.', icon: '/pieces/wN.svg', href: '/learn/checkmate-smothered', progress: { type: 'puzzle-set', key: 'checkmate-smothered' } },
      { id: 'mate-in-2', name: 'Mate in 2', desc: 'Set up the checkmate in two precise moves.', icon: '/pieces/wQ.svg', href: '/learn/checkmate-mate-in-2', progress: { type: 'puzzle-set', key: 'checkmate-mate-in-2' } },
      { id: 'game-fools-mate', name: "Fool's Mate", desc: 'The shortest possible checkmate — just two moves!', icon: '/pieces/bQ.svg', href: '/games/fools-mate', progress: { type: 'none' } },
      { id: 'game-legal', name: "Legal's Mate", desc: 'The original queen sacrifice trap — checkmate with minor pieces.', icon: '/pieces/wN.svg', href: '/games/legal-mate', progress: { type: 'none' } },
      { id: 'game-budapest', name: 'Budapest Smothered', desc: 'A knight delivers mate surrounded by the opponent\'s own pieces.', icon: '/pieces/bN.svg', href: '/games/budapest-smothered', progress: { type: 'none' } },
      { id: 'game-greco-smothered', name: "Greco's Smothered", desc: 'Greco sacrifices the queen so the knight delivers smothered mate.', icon: '/pieces/bN.svg', href: '/games/greco-smothered', progress: { type: 'none' } },
      { id: 'opening-scholars', name: "Scholar's Mate", desc: 'Learn and defend against the fastest checkmate.', icon: '/pieces/wQ.svg', href: '/openings/scholars-mate', progress: { type: 'none' } },
      { id: 'game-opera', name: 'The Opera Game', desc: 'Morphy\'s masterpiece — rapid development and open lines.', icon: '/pieces/wQ.svg', href: '/games/opera', progress: { type: 'none' } },
    ],
  },

  // ── Level 4: The Cantering (9) ─────────────
  {
    id: 'the-cantering',
    title: 'Level 4: The Cantering',
    stops: [
      { id: 'tactics-pins', name: 'Pins', desc: 'Trap a piece on a line — it can\'t move!', icon: '/pieces/wB.svg', href: '/learn/tactics-pins', progress: { type: 'puzzle-set', key: 'tactics-pins' } },
      { id: 'tactics-forks', name: 'Forks', desc: 'Attack two pieces at once with the knight.', icon: '/pieces/wN.svg', href: '/learn/tactics-forks', progress: { type: 'puzzle-set', key: 'tactics-forks' } },
      { id: 'tactics-skewers', name: 'Skewers', desc: 'Attack through one piece to grab another.', icon: '/pieces/wR.svg', href: '/learn/tactics-skewers', progress: { type: 'puzzle-set', key: 'tactics-skewers' } },
      { id: 'tactics-removing-defender', name: 'Removing Defender', desc: 'Capture the piece that guards a target.', icon: '/pieces/wR.svg', href: '/learn/tactics-removing-defender', progress: { type: 'puzzle-set', key: 'tactics-removing-defender' } },
      { id: 'tactics-discovered', name: 'Discovered Attacks', desc: 'Move one piece to unleash another.', icon: '/pieces/wN.svg', href: '/learn/tactics-discovered', progress: { type: 'puzzle-set', key: 'tactics-discovered' } },
      { id: 'game-greco-gift', name: "Greco's Greek Gift", desc: 'The original Bxh7+ sacrifice — Greco storms the kingside.', icon: '/pieces/wB.svg', href: '/games/greco-greek-gift', progress: { type: 'none' } },
      { id: 'game-greco-mate', name: "Greco's Mate", desc: 'The knight dances with discovered checks, then Qh8# delivers the blow.', icon: '/pieces/wN.svg', href: '/games/greco-mate', progress: { type: 'none' } },
      { id: 'endings-krk', name: 'Rook vs King', desc: 'Deliver checkmate with King + Rook.', icon: '/pieces/wR.svg', href: '/learn/endings-krk', progress: { type: 'localStorage', key: 'endings-krk-best-stars' } },
      { id: 'pawn-endings-lesson', name: 'Pawn Endings', desc: 'Key squares, opposition, and essential pawn patterns.', icon: '/pieces/wK.svg', href: '/learn/pawn-endings-lesson', progress: { type: 'localStorage', key: 'pawn-endings-lesson-best-stars' } },
    ],
  },

  // ── Level 5: The Galloper (9) ──────────────
  {
    id: 'the-galloper',
    title: 'Level 5: The Galloper',
    stops: [
      { id: 'pawn-endings-practice', name: 'Pawn Ending Practice', desc: '20 pawn ending puzzles from Lichess — apply what you learned!', icon: '/pieces/wP.svg', href: '/learn/pawn-endings-practice', progress: { type: 'puzzle-set', key: 'pawn-endings-practice' } },
      { id: 'play-basic', name: 'Play vs Basic Bot', desc: 'Test your skills against a bot that thinks one move ahead.', icon: '/pieces/wN.svg', href: '/play?level=basic', progress: { type: 'none' } },
      { id: 'vision-color', name: 'Color of Square', desc: 'Dark or light? Identify the color from the name.', icon: '/pieces/wP.svg', href: '/vision/color', progress: { type: 'localStorage', key: 'blindfold-color-best-stars' } },
      { id: 'vision-rankfile', name: 'Same Rank/File', desc: 'Do these two squares share a rank or file?', icon: '/pieces/wR.svg', href: '/vision/rankfile', progress: { type: 'localStorage', key: 'blindfold-rankfile-best-stars' } },
      { id: 'vision-diagonals', name: 'Same Diagonal', desc: 'Are these two squares on the same diagonal?', icon: '/pieces/wB.svg', href: '/vision/diagonals', progress: { type: 'localStorage', key: 'blindfold-diagonal-best-stars' } },
      { id: 'vision-counting', name: 'Move Counting', desc: 'How many squares does this piece control?', icon: '/pieces/wQ.svg', href: '/vision/counting', progress: { type: 'localStorage', key: 'blindfold-counting-best-stars' } },
      { id: 'vision-reachability', name: 'Piece Reachability', desc: 'Can this piece reach that square? Yes or no!', icon: '/pieces/wN.svg', href: '/vision/reachability', progress: { type: 'localStorage', key: 'blindfold-reachability-best-stars' } },
      { id: 'vision-changed', name: 'What Changed?', desc: 'Memorize a position, then spot what moved.', icon: '/pieces/wR.svg', href: '/vision/changed', progress: { type: 'localStorage', key: 'blindfold-changed-best-stars' } },
      { id: 'vision-landed', name: 'Where Did It Land?', desc: 'Follow opening moves mentally, then find a piece.', icon: '/pieces/wN.svg', href: '/vision/landed', progress: { type: 'localStorage', key: 'blindfold-landed-best-stars' } },
    ],
  },

  // ── Level 6: The Destrier (9) ──────────────
  {
    id: 'the-destrier',
    title: 'Level 6: The Destrier',
    stops: [
      { id: 'vision-flash', name: 'Flash Position', desc: 'Memorize a position, then place pieces from memory.', icon: '/pieces/wK.svg', href: '/vision/flash', progress: { type: 'localStorage', key: 'blindfold-flash-best-stars' } },
      { id: 'vision-piececount', name: 'Piece Count', desc: 'Flash a position — how many pieces of each type?', icon: '/pieces/wP.svg', href: '/vision/piececount', progress: { type: 'localStorage', key: 'blindfold-piececount-best-stars' } },
      { id: 'vision-knight-routes', name: 'Knight Routes', desc: 'Find a knight path between two squares — no board!', icon: '/pieces/wN.svg', href: '/vision/knight-routes', progress: { type: 'none' } },
      { id: 'vision-bishop-routes', name: 'Bishop Routes', desc: 'Find a bishop path — or spot when it\'s impossible!', icon: '/pieces/wB.svg', href: '/vision/bishop-routes', progress: { type: 'none' } },
      { id: 'vision-rookmaze', name: 'Rook Maze', desc: 'Navigate a rook around obstacles — no board!', icon: '/pieces/wR.svg', href: '/vision/rookmaze', progress: { type: 'none' } },
      { id: 'vision-gauntlet', name: 'Knight Gauntlet', desc: 'Navigate the knight without stepping on attacked squares!', icon: '/pieces/wN.svg', href: '/vision/gauntlet', progress: { type: 'none' } },
      { id: 'game-immortal', name: 'The Immortal Game', desc: 'Anderssen sacrifices everything — both rooks, a bishop, and his queen.', icon: '/pieces/wB.svg', href: '/games/immortal', progress: { type: 'none' } },
      { id: 'game-rubinstein', name: "Rubinstein's Immortal", desc: 'A devastating queen sacrifice where Black\'s pieces swarm the king.', icon: '/pieces/bQ.svg', href: '/games/rubinstein-immortal', progress: { type: 'none' } },
      { id: 'game-gold-coins', name: 'Gold Coins Game', desc: 'Marshall\'s stunning final move supposedly made spectators throw gold coins.', icon: '/pieces/bQ.svg', href: '/games/gold-coins', progress: { type: 'none' } },
    ],
  },

  // ── Level 7: The Stallion (9) ──────────────
  {
    id: 'the-stallion',
    title: 'Level 7: The Stallion',
    stops: [
      { id: 'game-century', name: 'Game of the Century', desc: '13-year-old Fischer sacrifices his queen and delivers a brilliant attack.', icon: '/pieces/bN.svg', href: '/games/game-of-century', progress: { type: 'none' } },
      { id: 'game-capablanca', name: 'Capablanca vs Bernstein', desc: 'Precise maneuvering leads to a winning combination.', icon: '/pieces/wN.svg', href: '/games/capablanca-bernstein', progress: { type: 'none' } },
      { id: 'endings-kbbk', name: 'Two Bishops vs King', desc: 'Deliver checkmate with King + 2 Bishops.', icon: '/pieces/wB.svg', href: '/learn/endings-kbbk', progress: { type: 'localStorage', key: 'endings-kbbk-best-stars' } },
      { id: 'endings-kbnk', name: 'Bishop + Knight', desc: 'Deliver checkmate with King + Bishop + Knight.', icon: '/pieces/wN.svg', href: '/learn/endings-kbnk', progress: { type: 'localStorage', key: 'endings-kbnk-best-stars' } },
      { id: 'vision-knightsquares', name: 'Knight Squares', desc: 'Name every square a knight can reach from a given square.', icon: '/pieces/wN.svg', href: '/vision/knightsquares', progress: { type: 'localStorage', key: 'blindfold-knightsquares-best-stars' } },
      { id: 'vision-blindtactics', name: 'Blind Tactics', desc: 'See a position, then find checkmate blindfolded!', icon: '/pieces/wQ.svg', href: '/vision/blindtactics', progress: { type: 'localStorage', key: 'blindfold-blindtactics-best-stars' } },
      { id: 'play-intermediate', name: 'Play vs Intermediate Bot', desc: 'A tougher opponent that looks two moves ahead.', icon: '/pieces/bN.svg', href: '/play?level=intermediate', progress: { type: 'none' } },
      { id: 'vision-puzzle', name: 'Blindfold Puzzles', desc: 'Pieces are invisible — solve from a text description!', icon: '/pieces/wK.svg', href: '/vision/puzzle', progress: { type: 'localStorage', key: 'blindfold-puzzle-best-stars' } },
      { id: 'vision-guarding', name: "Who's Guarding?", desc: 'Track piece interactions as they move — blindfolded!', icon: '/pieces/wQ.svg', href: '/vision/guarding', progress: { type: 'localStorage', key: 'blindfold-guarding-best-stars' } },
    ],
  },

  // ── Level 8: The Charger (6 — more coming) ─
  {
    id: 'the-charger',
    title: 'Level 8: The Charger',
    stops: [
      { id: 'endings-lucena', name: 'Lucena Position', desc: 'Build a bridge to promote your rook pawn.', icon: '/pieces/wR.svg', href: '/learn/endings-lucena', progress: { type: 'puzzle-set', key: 'endings-lucena' } },
      { id: 'endings-kpk-draw', name: 'KPK: Defend', desc: 'Hold the draw with opposition against perfect play.', icon: '/pieces/bK.svg', href: '/learn/endings-kpk-draw', progress: { type: 'localStorage', key: 'draw-kpk-best-stars' } },
      { id: 'bf-mate-kqk', name: 'BF Mate: Q vs K', desc: 'Deliver checkmate blindfolded with King + Queen.', icon: '/pieces/wQ.svg', href: '/vision/mate-kqk', progress: { type: 'localStorage', key: 'blindfold-mate-kqk-best-stars' } },
      { id: 'bf-mate-krrk', name: 'BF Mate: RR vs K', desc: 'Deliver checkmate blindfolded with King + 2 Rooks.', icon: '/pieces/wR.svg', href: '/vision/mate-krrk', progress: { type: 'localStorage', key: 'blindfold-mate-krrk-best-stars' } },
      { id: 'bf-mate-krk', name: 'BF Mate: R vs K', desc: 'Deliver checkmate blindfolded with King + Rook.', icon: '/pieces/wR.svg', href: '/vision/mate-krk', progress: { type: 'localStorage', key: 'blindfold-mate-krk-best-stars' } },
      { id: 'bf-mate-kbbk', name: 'BF Mate: BB vs K', desc: 'Deliver checkmate blindfolded with King + 2 Bishops.', icon: '/pieces/wB.svg', href: '/vision/mate-kbbk', progress: { type: 'localStorage', key: 'blindfold-mate-kbbk-best-stars' } },
      { id: 'bf-mate-kbnk', name: 'BF Mate: BN vs K', desc: 'Deliver checkmate blindfolded with King + Bishop + Knight.', icon: '/pieces/wN.svg', href: '/vision/mate-kbnk', progress: { type: 'localStorage', key: 'blindfold-mate-kbnk-best-stars' } },
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

/** Find the first incomplete stop and return its info for the Continue button.
 *  For puzzle-set stops, links directly to the first incomplete puzzle. */
export function getFirstIncompleteStop(stopStars: Record<string, number>): { id: string; name: string; href: string } | null {
  const id = getFirstIncompleteId(stopStars);
  if (!id) return null;
  for (const chapter of CURRICULUM) {
    for (const stop of chapter.stops) {
      if (stop.id !== id) continue;
      let href = stop.href;
      // For puzzle-set stops, find the first incomplete puzzle and link directly to it
      if (stop.progress.type === 'puzzle-set') {
        const set = getPuzzlesForPiece(stop.progress.key);
        if (set) {
          const firstIncomplete = set.puzzles.find(p => {
            const prog = getPuzzleProgress(p.id);
            return !prog || !prog.completed;
          });
          if (firstIncomplete) {
            href = `/learn/${stop.progress.key}/${firstIncomplete.id}`;
          }
        }
      }
      return { id: stop.id, name: stop.name, href };
    }
  }
  return null;
}
