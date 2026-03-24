export type PieceKind = "R" | "B" | "Q" | "K" | "N" | "P";
export type PieceColor = "w" | "b";

export interface PiecePlacement {
  piece: PieceKind;
  color: PieceColor;
  square: SquareId;
}

export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
export type SquareId = `${File}${Rank}`;

export const FILES: File[] = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS: Rank[] = ["8", "7", "6", "5", "4", "3", "2", "1"];

export interface BoardState {
  pieces: Map<SquareId, { piece: PieceKind; color: PieceColor }>;
  enPassantSquare?: SquareId;
  castlingRights?: { K: boolean; Q: boolean; k: boolean; q: boolean };
}

export function squareToCoords(sq: SquareId): [number, number] {
  const file = sq.charCodeAt(0) - 97; // a=0
  const rank = 8 - parseInt(sq[1]);   // 8=0, 1=7
  return [file, rank];
}

export function coordsToSquare(file: number, rank: number): SquareId | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${RANKS[rank]}` as SquareId;
}

export function createBoardState(
  placements: PiecePlacement[],
  options?: { enPassantSquare?: SquareId; castlingRights?: BoardState["castlingRights"] },
): BoardState {
  const pieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();
  for (const p of placements) {
    pieces.set(p.square, { piece: p.piece, color: p.color });
  }
  return { pieces, enPassantSquare: options?.enPassantSquare, castlingRights: options?.castlingRights };
}

const FEN_PIECES: Record<string, { piece: PieceKind; color: PieceColor }> = {
  K: { piece: "K", color: "w" }, Q: { piece: "Q", color: "w" },
  R: { piece: "R", color: "w" }, B: { piece: "B", color: "w" },
  N: { piece: "N", color: "w" }, P: { piece: "P", color: "w" },
  k: { piece: "K", color: "b" }, q: { piece: "Q", color: "b" },
  r: { piece: "R", color: "b" }, b: { piece: "B", color: "b" },
  n: { piece: "N", color: "b" }, p: { piece: "P", color: "b" },
};

/**
 * Parse a FEN position string into PiecePlacement[].
 * Accepts a full FEN or just the piece-placement part (ranks separated by /).
 * If full FEN, also extracts castling rights and en passant square.
 */
export function parseFen(fen: string): {
  placements: PiecePlacement[];
  castlingRights?: BoardState["castlingRights"];
  enPassantSquare?: SquareId;
} {
  const parts = fen.trim().split(/\s+/);
  const ranks = parts[0].split("/");
  const placements: PiecePlacement[] = [];

  for (let ri = 0; ri < 8; ri++) {
    let fi = 0;
    for (const ch of ranks[ri]) {
      if (ch >= "1" && ch <= "8") {
        fi += parseInt(ch);
      } else {
        const entry = FEN_PIECES[ch];
        if (entry) {
          const sq = `${FILES[fi]}${RANKS[ri]}` as SquareId;
          placements.push({ piece: entry.piece, color: entry.color, square: sq });
        }
        fi++;
      }
    }
  }

  let castlingRights: BoardState["castlingRights"] | undefined;
  if (parts.length >= 3 && parts[2] !== "-") {
    castlingRights = {
      K: parts[2].includes("K"),
      Q: parts[2].includes("Q"),
      k: parts[2].includes("k"),
      q: parts[2].includes("q"),
    };
  }

  let enPassantSquare: SquareId | undefined;
  if (parts.length >= 4 && parts[3] !== "-") {
    enPassantSquare = parts[3] as SquareId;
  }

  return { placements, castlingRights, enPassantSquare };
}

/** Create a string key for a board position (pieces + castling + en passant + side to move). */
export function boardToKey(board: BoardState, colorToMove: PieceColor): string {
  const parts: string[] = [];
  const sorted = [...board.pieces.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [sq, p] of sorted) {
    parts.push(`${sq}${p.color}${p.piece}`);
  }
  if (board.castlingRights) {
    const cr = board.castlingRights;
    parts.push(`c${cr.K ? "K" : ""}${cr.Q ? "Q" : ""}${cr.k ? "k" : ""}${cr.q ? "q" : ""}`);
  }
  if (board.enPassantSquare) {
    parts.push(`e${board.enPassantSquare}`);
  }
  parts.push(colorToMove);
  return parts.join("|");
}
