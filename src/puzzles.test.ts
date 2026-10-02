import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getAllPieceKeys, getPuzzlesForPiece } from '$lib/puzzles';
import { parsePuzzleMoves } from '$lib/puzzles/parse-moves';
import { parseFen, createBoardState, type PieceColor } from '$lib/logic/types';
import { isInCheck } from '$lib/logic/attacks';

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
