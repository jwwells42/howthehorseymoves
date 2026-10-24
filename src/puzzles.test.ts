import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getAllPieceKeys, getPuzzlesForPiece } from '$lib/puzzles';
import { parsePuzzleMoves } from '$lib/puzzles/parse-moves';
import { parseFen, createBoardState, type PieceColor } from '$lib/logic/types';
import { isInCheck } from '$lib/logic/attacks';
import { OPENINGS, parseOpeningPgn, extractLines } from '$lib/openings';
import { readTypedMove } from '$lib/logic/pgn';

/*
  Catches puzzle data that would break a page. A puzzle whose moves can't be
  played never opens: typing its address shows an error, and clicking it does
  nothing. This doesn't check that a puzzle is good chess, only that it can run.
*/

const SRC = 'src';

describe('puzzles', () => {
  it('every puzzle loads', () => {
    const broken: string[] = [];
    for (const key of getAllPieceKeys()) {
      for (const puzzle of getPuzzlesForPiece(key)?.puzzles ?? []) {
        if (puzzle.type !== 'puzzle') continue;
        const lines: [string, string][] = [['moves', puzzle.pgn]];
        if (typeof puzzle.demo === 'string') lines.push(['demo', puzzle.demo]);
        for (const [label, pgn] of lines) {
          const where = `/learn/${key}/${puzzle.id} (${label})`;
          try {
            if (parsePuzzleMoves(pgn, puzzle.fen).children.length === 0) broken.push(`${where}: no moves`);
          } catch (e) {
            broken.push(`${where}: ${(e as Error).message}`);
          }
        }
      }
    }
    expect(broken).toEqual([]);
  });
});

describe('openings', () => {
  // A repertoire is re-exported from Lichess and its file overwritten, so a
  // move that doesn't parse would break its page; this finds it before a push
  it('every opening loads', () => {
    const broken: string[] = [];
    for (const opening of OPENINGS) {
      const where = `/openings/${opening.id}`;
      const pgns: [string, string][] = [['all', opening.pgn]];
      for (const chapter of opening.chapters ?? []) pgns.push([chapter.name, chapter.pgn]);
      for (const [label, pgn] of pgns) {
        try {
          if (extractLines(parseOpeningPgn(pgn)).length === 0) broken.push(`${where} (${label}): no moves`);
        } catch (e) {
          broken.push(`${where} (${label}): ${(e as Error).message}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});

// ---- Starting positions -----------------------------------------------------

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|svelte|pgn)$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

/** A FEN's board and the side to move, wherever one is written in src/. */
const FEN = /((?:[rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8})\s+([wb])\b/g;
const NAME = { w: 'White', b: 'Black' };

describe('starting positions', () => {
  it('no position has the side not to move in check, or a pawn on its first or last rank', () => {
    const illegal: string[] = [];
    for (const file of sourceFiles(SRC)) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        for (const [, ranks, side] of line.matchAll(FEN)) {
          const toMove = side as PieceColor;
          const waiting: PieceColor = toMove === 'w' ? 'b' : 'w';
          const { placements } = parseFen(ranks);
          const board = createBoardState(placements);
          const where = `${relative('.', file)}:${i + 1}  ${ranks} ${side}`;
          const kings = placements.filter((p) => p.piece === 'K');
          if (kings.length === 2 && kings[0].color !== kings[1].color && isInCheck(waiting, board)) {
            illegal.push(`${where}: ${NAME[toMove]} to move, but ${NAME[waiting]} is in check`);
          }
          for (const p of placements) {
            if (p.piece === 'P' && (p.square[1] === '1' || p.square[1] === '8')) {
              illegal.push(`${where}: a pawn on ${p.square}`);
            }
          }
        }
      });
    }
    expect(illegal).toEqual([]);
  });
});

describe('typed moves', () => {
  function boardOf(fen: string) {
    const { placements, castlingRights, enPassantSquare } = parseFen(fen);
    return createBoardState(placements, { castlingRights, enPassantSquare });
  }
  const START = boardOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  it('reads a move however it is typed', () => {
    for (const text of ['Nf3', 'nf3', 'Ngf3', 'Nf3+', ' Nf3! ']) {
      expect(readTypedMove(text, START, 'w'), text).toEqual({ from: 'g1', to: 'f3' });
    }
    expect(readTypedMove('e4', START, 'w')).toEqual({ from: 'e2', to: 'e4' });
    expect(readTypedMove('e5', START, 'b')).toEqual({ from: 'e7', to: 'e5' });
  });

  it('reads captures with or without the x', () => {
    const board = boardOf('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
    expect(readTypedMove('exd5', board, 'w')).toEqual({ from: 'e4', to: 'd5' });
    expect(readTypedMove('ed5', board, 'w')).toEqual({ from: 'e4', to: 'd5' });
  });

  it('reads castling with O or 0', () => {
    const board = boardOf('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    for (const text of ['O-O', '0-0', 'o-o']) expect(readTypedMove(text, board, 'w'), text).toEqual({ from: 'e1', to: 'g1' });
    for (const text of ['O-O-O', '0-0-0']) expect(readTypedMove(text, board, 'b'), text).toEqual({ from: 'e8', to: 'c8' });
  });

  it('tries a lowercase b as a pawn first', () => {
    expect(readTypedMove('bxc3', boardOf('4k3/8/8/8/8/2n5/1P6/4K3 w - - 0 1'), 'w')).toEqual({ from: 'b2', to: 'c3' });
    expect(readTypedMove('bc2', boardOf('4k3/8/8/8/8/8/8/1B2K3 w - - 0 1'), 'w')).toEqual({ from: 'b1', to: 'c2' });
  });

  it('needs to know which piece when two can go', () => {
    const board = boardOf('4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1');
    expect(readTypedMove('Nd2', board, 'w')).toBeNull();
    expect(readTypedMove('Nbd2', board, 'w')).toEqual({ from: 'b1', to: 'd2' });
    expect(readTypedMove('Nfd2', board, 'w')).toEqual({ from: 'f1', to: 'd2' });
  });

  it('is null for anything that is not a legal move', () => {
    for (const text of ['', 'zz', 'Bc4', 'Nd2', 'e5', 'O-O', 'Ke2', 'Qh5']) {
      expect(readTypedMove(text, START, 'w'), text).toBeNull();
    }
  });
});
