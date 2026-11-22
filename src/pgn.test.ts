import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { splitPgnGames, readHeaders, parseArrows, parseGamePgn } from '$lib/logic/pgn';
import { splitPgnChapters } from '$lib/openings';

/*
  Reading PGN files made elsewhere: a game database's export (clock tags on
  every move, Windows line endings, a forfeit with no moves) splits into its
  games, and a Lichess study's chapters keep their names.
*/

const EXPORT = [
  '[Event "Club 1"]',
  '[White "KnightRider"]',
  '[Black "Pawn \\"Storm\\""]',
  '[Result "1-0"]',
  '',
  '1. e4 { [%clk 0:04:58] } e5 { [%clk 0:04:57] } 2. Qh5 { [%eval 0.1] [%clk 0:04:50] } Nc6 3. Bc4 Nf6?? { [%eval #1] } 4. Qxf7# 1-0',
  '',
  '[Event "Club 1"]',
  '[White "Pawn \\"Storm\\""]',
  '[Black "KnightRider"]',
  '[Result "0-1"]',
  '',
  '0-1',
  '',
  '[Event "Club 2"]',
  '[White "A"]',
  '[Black "B"]',
  '',
  '1. d4 d5 *',
].join('\r\n');

describe('PGN files from elsewhere', () => {
  it('splits an export into its games, a forfeit included', () => {
    const games = splitPgnGames(EXPORT);
    expect(games.map((g) => g.headers.Event)).toEqual(['Club 1', 'Club 1', 'Club 2']);
    expect(games[0].headers.Black).toBe('Pawn "Storm"');
    expect(games[1].headers.Result).toBe('0-1');
    expect(games[2].pgn).toMatch(/1\. d4 d5/);
  });

  it('reads castling that gives check (O-O-O+)', () => {
    const tree = parseGamePgn('1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Nf6 5. Nxc6 dxc6 6. Qxd8+ Kxd8 7. Bg5 Be7 8. Nc3 h6 9. O-O-O+ Ke8');
    let node = tree.children[0];
    while (node.children[0] && node.san !== 'O-O-O+') node = node.children[0];
    expect([node.san, node.from, node.to]).toEqual(['O-O-O+', 'e1', 'c1']);
    expect(node.boardAfter.pieces.get('d1')?.piece).toBe('R');
  });

  it('reads headers', () => {
    expect(readHeaders('[White "A"]\n[WhiteElo "1200"]\n\n1. e4')).toEqual({ White: 'A', WhiteElo: '1200' });
  });

  it('drops clock tags and reads evals, highlights and arrows', () => {
    expect(parseArrows('[%clk 0:04:58]').text).toBe('');
    expect(parseArrows('[%eval -0.35] [%clk 0:01:00]').eval).toEqual({ cp: -35 });
    expect(parseArrows('[%eval #-2]').eval).toEqual({ mate: -2 });
    const c = parseArrows('Good move [%csl Gd4,Re5] [%cal Gg1f3]');
    expect(c.text).toBe('Good move');
    expect(c.highlights.map((h) => h.square)).toEqual(['d4', 'e5']);
    expect(c.arrows.map((a) => a.to)).toEqual(['f3']);
  });

  it('a game with clocks has no clock comments', () => {
    const tree = parseGamePgn(splitPgnGames(EXPORT)[0].pgn);
    const comments: (string | undefined)[] = [];
    let node = tree.children[0];
    while (node) {
      comments.push(node.comment);
      node = node.children[0];
    }
    expect(comments.every((c) => c === undefined)).toBe(true);
    expect(tree.children[0].children[0].children[0].eval).toEqual({ cp: 10 });
  });

  it('a study keeps its chapter names, in order, without the move-less intro', () => {
    for (const file of ['e4-mainline-starter', 'd4-mainline-starter']) {
      const pgn = readFileSync(`src/lib/openings/pgn/${file}.pgn`, 'utf8');
      const named = splitPgnGames(pgn)
        .filter((g) => /\d\.\s*\S/.test(g.pgn.replace(/^\s*\[.*$/gm, '').replace(/\{[^}]*\}/g, '')))
        .map((g) => g.headers.ChapterName);
      expect(named.length).toBeGreaterThan(1);
      expect(splitPgnChapters(pgn).map((c) => c.name)).toEqual(named);
    }
  });
});
