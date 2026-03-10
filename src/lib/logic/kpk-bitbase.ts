/**
 * KPK Endgame Bitbase — Perfect play for King+Pawn vs King.
 *
 * Uses retrograde analysis (same algorithm as Stockfish's bitbase.cpp)
 * to classify every legal KPK position as WIN or DRAW for the pawn side.
 *
 * Index space: 2 (side to move) × 24 (pawn squares, files a-d only) × 64 (wK) × 64 (bK)
 *            = 196,608 positions → 24 KB as a bit array.
 *
 * Generated once on first probe (~5-15ms), then all lookups are instant.
 */

// ---------- constants ----------

const WHITE = 0;
const BLACK = 1;

// Result flags — powers of 2 so they can be OR'd together
const INVALID = 0;
const UNKNOWN = 1;
const DRAW = 2;
const WIN = 4;

const MAX_INDEX = 2 * 24 * 64 * 64; // 196,608

// ---------- square helpers ----------

function fileOf(sq: number): number {
  return sq & 7;
}

function rankOf(sq: number): number {
  return sq >> 3;
}

function makeSquare(file: number, rank: number): number {
  return (rank << 3) | file;
}

/** Chebyshev distance between two squares */
function squareDistance(a: number, b: number): number {
  return Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
}

/** Mirror a square horizontally (flip file) */
function mirrorFile(sq: number): number {
  return sq ^ 7;
}

/** All king-move target squares from a given square */
function kingMoves(sq: number): number[] {
  const moves: number[] = [];
  const f = fileOf(sq);
  const r = rankOf(sq);
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const nf = f + df;
      const nr = r + dr;
      if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
        moves.push(makeSquare(nf, nr));
      }
    }
  }
  return moves;
}

/** White pawn attack squares (diagonally forward) */
function pawnAttacks(sq: number): number[] {
  const attacks: number[] = [];
  const f = fileOf(sq);
  const r = rankOf(sq);
  if (r < 7) {
    if (f > 0) attacks.push(makeSquare(f - 1, r + 1));
    if (f < 7) attacks.push(makeSquare(f + 1, r + 1));
  }
  return attacks;
}

// ---------- indexing ----------

/**
 * Encode a position into an index.
 * Pawn file must be 0-3 (a-d). Pawn rank must be 1-6 (ranks 2-7, 0-indexed).
 */
function index(us: number, wksq: number, bksq: number, psq: number): number {
  const pFile = fileOf(psq);         // 0-3
  const pRank = rankOf(psq) - 1;     // rank 2-7 → 0-5
  return wksq | (bksq << 6) | (us << 12) | (pFile << 13) | (pRank << 15);
}

// ---------- position classification ----------

interface KPKEntry {
  result: number;
  us: number;
  wksq: number;
  bksq: number;
  psq: number;
}

function initEntry(idx: number): KPKEntry {
  // Decode index
  const wksq = idx & 63;
  const bksq = (idx >> 6) & 63;
  const us = (idx >> 12) & 1;
  const pFile = (idx >> 13) & 3;
  const pRank = ((idx >> 15) & 7) + 1; // 0-5 → rank 1-6 (0-indexed), so ranks 1-6 → actual ranks 2-7
  const psq = makeSquare(pFile, pRank);

  // Check validity
  // Kings on same square, or king on pawn square
  if (wksq === bksq || wksq === psq || bksq === psq) {
    return { result: INVALID, us, wksq, bksq, psq };
  }
  // Kings adjacent
  if (squareDistance(wksq, bksq) <= 1) {
    return { result: INVALID, us, wksq, bksq, psq };
  }
  // Pawn attacks black king but it's white's turn (means black moved INTO check)
  if (us === WHITE && pawnAttacks(psq).includes(bksq)) {
    return { result: INVALID, us, wksq, bksq, psq };
  }

  // Immediate results
  if (us === WHITE) {
    // Pawn on rank 7 (0-indexed: rank 6) → about to promote
    if (rankOf(psq) === 6) {
      const promoSq = psq + 8; // rank 7 (0-indexed)
      // Promotion square not blocked by own king
      if (promoSq !== wksq) {
        // Black king can't reach promo square, or white king defends it
        if (squareDistance(bksq, promoSq) > 1 || squareDistance(wksq, promoSq) <= 1) {
          return { result: WIN, us, wksq, bksq, psq };
        }
      }
    }
  } else {
    // Black to move — check for stalemate or pawn capture
    const bkMoves = kingMoves(bksq);
    // Can black king capture the pawn?
    if (bkMoves.includes(psq) && squareDistance(wksq, psq) > 1 &&
        !(squareDistance(wksq, psq) === 2 && us === BLACK && pawnAttacks(psq).some(a => a === bksq))) {
      // Actually let's be more careful: black captures pawn if bK attacks pawn
      // and white king doesn't defend it
      if (squareDistance(wksq, psq) > 1) {
        return { result: DRAW, us, wksq, bksq, psq };
      }
    }
    // Stalemate check: all black king moves go to squares attacked by white king or pawn
    const isStalemate = bkMoves.every(sq => {
      if (sq === wksq || sq === psq) return true; // occupied
      if (squareDistance(sq, wksq) <= 1) return true; // attacked by white king
      if (pawnAttacks(psq).includes(sq)) return true; // attacked by pawn
      return false;
    });
    if (isStalemate) {
      return { result: DRAW, us, wksq, bksq, psq };
    }
  }

  return { result: UNKNOWN, us, wksq, bksq, psq };
}

function classify(entry: KPKEntry, db: KPKEntry[]): number {
  if (entry.result !== UNKNOWN) return entry.result;

  let r = INVALID; // accumulator — OR in successor results

  if (entry.us === WHITE) {
    // White king moves → becomes black to move
    for (const to of kingMoves(entry.wksq)) {
      if (to === entry.psq) continue; // can't move onto own pawn
      if (squareDistance(to, entry.bksq) <= 1) continue; // can't move adjacent to enemy king (illegal)
      r |= db[index(BLACK, to, entry.bksq, entry.psq)].result;
    }
    // Pawn push
    if (rankOf(entry.psq) < 6) { // not yet on rank 7
      const push = entry.psq + 8;
      if (push !== entry.wksq && push !== entry.bksq) {
        r |= db[index(BLACK, entry.wksq, entry.bksq, push)].result;
        // Double push from rank 2
        if (rankOf(entry.psq) === 1) {
          const dblPush = entry.psq + 16;
          if (dblPush !== entry.wksq && dblPush !== entry.bksq && push !== entry.wksq && push !== entry.bksq) {
            r |= db[index(BLACK, entry.wksq, entry.bksq, dblPush)].result;
          }
        }
      }
    }
    // Pawn on rank 7 promotions are handled as immediate WIN in initEntry

    // White: any WIN → WIN; else any UNKNOWN → UNKNOWN; else DRAW
    if (r & WIN) return WIN;
    if (r & UNKNOWN) return UNKNOWN;
    return DRAW;
  } else {
    // Black king moves → becomes white to move
    for (const to of kingMoves(entry.bksq)) {
      if (to === entry.wksq) continue; // can't capture white king
      if (to === entry.psq) continue; // pawn capture handled separately in initEntry
      if (squareDistance(to, entry.wksq) <= 1) continue; // can't move adjacent to white king
      if (pawnAttacks(entry.psq).includes(to)) continue; // can't move into pawn attack
      r |= db[index(WHITE, entry.wksq, to, entry.psq)].result;
    }

    // Black: any DRAW → DRAW; else any UNKNOWN → UNKNOWN; else WIN
    if (r & DRAW) return DRAW;
    if (r & UNKNOWN) return UNKNOWN;
    return WIN;
  }
}

// ---------- generation ----------

let bitbase: Uint32Array | null = null;

function generate(): Uint32Array {
  // Step 1: Initialize all positions
  const db: KPKEntry[] = new Array(MAX_INDEX);
  for (let i = 0; i < MAX_INDEX; i++) {
    db[i] = initEntry(i);
  }

  // Step 2: Iterate until convergence
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < MAX_INDEX; i++) {
      if (db[i].result !== UNKNOWN) continue;
      const newResult = classify(db[i], db);
      if (newResult !== UNKNOWN) {
        db[i].result = newResult;
        changed = true;
      }
    }
  }

  // Step 3: Pack into bit array
  const bb = new Uint32Array(MAX_INDEX / 32);
  for (let i = 0; i < MAX_INDEX; i++) {
    if (db[i].result === WIN) {
      bb[i >>> 5] |= 1 << (i & 31);
    }
  }

  return bb;
}

// ---------- public API ----------

/**
 * Probe the KPK bitbase. Returns true if the position is a WIN
 * for white (the side with the pawn), false if it's a DRAW.
 *
 * Squares are 0-63: a1=0, b1=1, ..., h1=7, a2=8, ..., h8=63.
 *
 * The pawn must be white. For positions where Black has the pawn,
 * the caller should flip the board vertically before probing.
 *
 * @param wksq - White king square (0-63)
 * @param bksq - Black king square (0-63)
 * @param psq  - White pawn square (0-63), must be on ranks 2-7
 * @param us   - Side to move: 0 = WHITE, 1 = BLACK
 */
export function probeKPK(wksq: number, bksq: number, psq: number, us: number): boolean {
  if (!bitbase) bitbase = generate();

  // Apply file symmetry: mirror everything if pawn is on files e-h
  if (fileOf(psq) > 3) {
    wksq = mirrorFile(wksq);
    bksq = mirrorFile(bksq);
    psq = mirrorFile(psq);
  }

  const idx = index(us, wksq, bksq, psq);
  return (bitbase[idx >>> 5] & (1 << (idx & 31))) !== 0;
}

/**
 * Convert algebraic square name to 0-63 index.
 * a1=0, b1=1, ..., h8=63.
 */
export function squareToIndex(sq: string): number {
  const file = sq.charCodeAt(0) - 97; // a=0
  const rank = parseInt(sq[1]) - 1;   // 1=0
  return makeSquare(file, rank);
}

/**
 * Convert 0-63 index to algebraic square name.
 */
export function indexToSquare(idx: number): string {
  return String.fromCharCode(97 + fileOf(idx)) + (rankOf(idx) + 1);
}

// Re-export constants for callers
export const KPK_WHITE = WHITE;
export const KPK_BLACK = BLACK;
