import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { splitPgnGames, readHeaders, parseArrows, parseGamePgn, mainLineOnly, withoutLichessAnalysis } from '$lib/logic/pgn';
import {
  OPENINGS,
  branchRows,
  extractLines,
  joinText,
  lineId,
  parseOpeningPgn,
  repertoireLines,
  splitPgnChapters,
  type OpeningLine,
} from '$lib/openings';
import { playerMoves } from '$lib/openings/progress';
import { GAMES, gameOpening, pgnGames } from '$lib/games';

/*
  Reading PGN files made elsewhere: a game database's export (clock tags on
  every move, Windows line endings, a forfeit with no moves) splits into its
  games, and a Lichess study's chapters keep their names. A match's file
  gives its finished games, without the words Lichess writes into it. A
  repertoire's line stops where it transposes into another.
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

  it('takes out side lines, but not brackets in a comment', () => {
    expect(mainLineOnly('1. e4 (1. d4 d5 (1... Nf6 { a (b) })) e5 { see (2. Bc4) } 2. Nf3')).toBe(
      '1. e4  e5 { see (2. Bc4) } 2. Nf3'
    );
  });

  it("drops the sentences Lichess writes, and keeps its marks, evals and a teacher's comment", () => {
    const pgn = '27. Qc2?? { [%eval -7.75] } { Blunder. Qe3 was best. } (27. Qe3 g4) 27... Bxa4 { 0-1 White resigns. } { Nice [%cal Ga4d1] }';
    const clean = withoutLichessAnalysis(pgn);
    expect(clean).toBe('27. Qc2?? { [%eval -7.75] } {  } (27. Qe3 g4) 27... Bxa4 {  } { Nice [%cal Ga4d1] }');
    expect(withoutLichessAnalysis('1. e4 { Mistake. d4 was best. [%eval 0.1] }')).toBe('1. e4 { [%eval 0.1] }');
    expect(withoutLichessAnalysis('{ 1/2-1/2 The game is a draw. }')).toBe('{  }');
  });

  it('a match file gives its finished games only, named first name first, with ids by round', () => {
    const games = pgnGames('club', EXPORT);
    // The forfeit has no moves and the last game is still on (*): both left out
    expect(games.map((g) => g.id)).toEqual(['club-1']);
    expect(games[0]).toMatchObject({ white: 'KnightRider', black: 'Pawn "Storm"', result: '1-0', collection: 'Club 1' });

    const wc1972 = pgnGames('wc1972', readFileSync('src/lib/games/pgn/wc-1972.pgn', 'utf8'));
    expect(wc1972).toHaveLength(20);
    expect(wc1972.map((g) => g.id)).not.toContain('wc1972-2');
    expect(wc1972[0]).toMatchObject({ id: 'wc1972-1', white: 'Boris V. Spassky', black: 'Robert James Fischer', year: 1972 });
    expect(wc1972.every((g) => !/was best|resigns/.test(g.pgn))).toBe(true);

    const wc2026 = pgnGames('wc2026', readFileSync('src/lib/games/pgn/wc-2026.pgn', 'utf8'));
    expect(wc2026.length).toBeGreaterThan(0);
    expect(wc2026.every((g) => g.result !== '*')).toBe(true);
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

const moves = (line: OpeningLine) => lineId(line);
const linesOf = (pgn: string) => repertoireLines(parseOpeningPgn(pgn));

describe('a repertoire: lines that transpose', () => {
  it('a line that reaches another line\'s position by other moves stops there, and says which', () => {
    const lines = linesOf('1.d4 c6 2.Bf4 (2.Nf3 Nf6 3.Bf4 Qb6 4.e3) 2...Qb6 3.Nf3 Nf6 4.e3');
    expect(lines.map(moves)).toEqual(['d4 c6 Bf4 Qb6 Nf3 Nf6 e3', 'd4 c6 Nf3 Nf6 Bf4 Qb6']);
    expect(lines[0].at(-1)?.joins).toBeUndefined();
    expect(moves(lines[1].at(-1)?.joins ?? [])).toBe('d4 c6 Bf4 Qb6 Nf3 Nf6');
    expect(joinText(lines[1])).toBe('⇄ 2.Bf4 Qb6 3.Nf3 Nf6');
  });

  it('a different move written past the join goes onto the first move order', () => {
    const lines = linesOf('1.d4 c6 2.Bf4 (2.Nf3 Nf6 3.Bf4 Qb6 4.Nbd2) 2...Qb6 3.Nf3 Nf6 4.e3');
    expect(lines.map(moves)).toEqual([
      'd4 c6 Bf4 Qb6 Nf3 Nf6 e3',
      'd4 c6 Nf3 Nf6 Bf4 Qb6',
      'd4 c6 Bf4 Qb6 Nf3 Nf6 Nbd2',
    ]);
  });

  it('the line written first is the one kept, whichever is the main line', () => {
    const lines = linesOf('1.d4 c6 2.Nf3 (2.Bf4 Qb6 3.Nf3 Nf6 4.e3) 2...Nf6 3.Bf4 Qb6 4.e3');
    expect(lines.map(moves)).toEqual(['d4 c6 Nf3 Nf6 Bf4 Qb6 e3', 'd4 c6 Bf4 Qb6 Nf3 Nf6']);
    expect(joinText(lines[1])).toBe('⇄ 2.Nf3 Nf6 3.Bf4 Qb6');
  });

  it('the same moves in two chapters are not a transposition, and each move knows its chapter', () => {
    const pgn = '[Event "A"]\n\n1.e4 e5 2.Nf3 *\n\n[Event "B"]\n\n1.e4 e5 2.Bc4 *';
    const lines = linesOf(pgn);
    expect(lines.map(moves)).toEqual(['e4 e5 Nf3', 'e4 e5 Bc4']);
    expect(lines.some((l) => l.at(-1)?.joins)).toBe(false);
    expect(lines.map((l) => l.map((m) => m.chapter))).toEqual([[0, 0, 0], [1, 1, 1]]);
  });

  it('a position coming back in the same line (a repetition) does not stop it', () => {
    expect(linesOf('1.Nf3 Nf6 2.Ng1 Ng8 3.Nf3 Nf6 4.e4').map(moves)).toEqual(['Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 e4']);
  });

  it("finds the teacher's two transpositions: one in the London, one in the Slav", () => {
    const joins = (id: string) =>
      linesOf(OPENINGS.find((o) => o.id === id)!.pgn).flatMap((l) => (l.at(-1)?.joins ? [joinText(l)] : []));
    expect(joins('c6-qb6-vs-london')).toEqual(['⇄ 2.Bf4 Qb6 3.Nf3 Nf6']);
    expect(joins('slav-defense')).toEqual(['⇄ 3.Nc3 Nf6 4.Nf3']);
    for (const id of ['e4', 'd4', 'scholars-mate']) expect(joins(id)).toEqual([]);
  });

  it('every opening keeps the same moves to learn, so saved progress counts the same', () => {
    for (const opening of OPENINGS) {
      const tree = parseOpeningPgn(opening.pgn);
      const keys = (lines: OpeningLine[]) => playerMoves(lines, opening.color).map((m) => m.key).sort();
      expect(keys(repertoireLines(tree)), opening.id).toEqual(keys(extractLines(tree)));
    }
  });

  it('every line of a study is in the chapter it was written in', () => {
    for (const opening of OPENINGS.filter((o) => o.chapters)) {
      const lines = repertoireLines(parseOpeningPgn(opening.pgn));
      opening.chapters!.forEach((chapter, c) => {
        const own = extractLines(parseOpeningPgn(chapter.pgn)).map(moves);
        const placed = lines.filter((l) => l.at(-1)?.chapter === c).map(moves);
        expect(placed, `${opening.id}: ${chapter.name}`).toEqual(own);
      });
    }
  });

  it('a game to memorize is one line, as written', () => {
    for (const game of GAMES) {
      const tree = parseOpeningPgn(gameOpening(game).pgn);
      expect(repertoireLines(tree).map(moves), game.id).toEqual(extractLines(tree).map(moves));
    }
  });

  it("the tree: each chapter's 1.e4 is one move, and a row runs to the next branch point", () => {
    const opening = OPENINGS.find((o) => o.id === 'e4')!;
    const tree = branchRows(repertoireLines(parseOpeningPgn(opening.pgn)));
    expect(tree.roots.map((n) => n.move.san)).toEqual(['e4']);
    expect(tree.rows.map((r) => r.nodes.map((n) => n.move.san).join(' '))).toEqual(['e4']);
    expect(tree.rows[0].rows.map((r) => r.nodes.map((n) => n.move.san).join(' '))).toEqual([
      'e5 Nf3',
      'c5 Nf3',
      'c6 d4 d5 e5',
      'e6 d4 d5 Nc3',
      'd6 d4 Nf6 Nc3 g6 Be3 Bg7 h3 O-O Qd2 c6 a4 Nbd7 Nf3 e5 dxe5 dxe5 Qd6 Qa5 b4 Qd8',
      'd5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3',
    ]);
  });

  it("the tree: a row that transposes ends there, with the move order it joins", () => {
    const tree = branchRows(linesOf('1.d4 c6 2.Bf4 (2.Nf3 Nf6 3.Bf4 Qb6 4.e3) 2...Qb6 3.Nf3 Nf6 4.e3'));
    const [trunk] = tree.rows;
    expect(trunk.nodes.map((n) => n.move.san)).toEqual(['d4', 'c6']);
    const [main, transposed] = trunk.rows;
    expect(main.joins).toBeUndefined();
    expect(transposed.nodes.map((n) => n.move.san)).toEqual(['Nf3', 'Nf6', 'Bf4', 'Qb6']);
    expect(moves(transposed.joins ?? [])).toBe('d4 c6 Bf4 Qb6 Nf3 Nf6');
  });
});
