import { describe, it, expect } from 'vitest';
import { readInfo, readUciMove, playLine, formatScore, winChance } from '$lib/engine/uci';
import { boardToFen } from '$lib/logic/fen';
import { parseFen, createBoardState } from '$lib/logic/types';
import { applyMove } from '$lib/logic/pgn';
import { judge, markMoves, countMarks, whiteChance, gamePositions } from '$lib/engine/review';

/*
  What the engine says, read right: scores turned to White's side, moves
  turned to SAN, and positions sent to it as FENs it can't choke on. A whole
  game's evals turned into ?! ? ?? the way Lichess marks them.
*/

function board(fen: string) {
  const { placements, castlingRights, enPassantSquare } = parseFen(fen);
  return createBoardState(placements, { castlingRights, enPassantSquare });
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('engine lines', () => {
  it('scores are from White\'s side, whoever is to move', () => {
    const line = 'info depth 14 seldepth 20 multipv 2 score cp 35 nodes 1000 nps 500 pv e7e5 g1f3';
    expect(readInfo(line, 'w')).toMatchObject({ rank: 2, depth: 14, score: { cp: 35 }, pv: ['e7e5', 'g1f3'] });
    expect(readInfo(line, 'b')?.score).toEqual({ cp: -35 });
    expect(readInfo('info depth 9 score mate 3 pv d1h5', 'b')?.score).toEqual({ mate: -3 });
  });

  it('skips lines that are only a bound, or have no moves', () => {
    expect(readInfo('info depth 12 score cp 20 upperbound pv e2e4', 'w')).toBeNull();
    expect(readInfo('info depth 12 currmove e2e4 currmovenumber 1', 'w')).toBeNull();
    expect(readInfo('info string NNUE evaluation enabled', 'w')).toBeNull();
  });

  it('reads UCI moves, promotions included', () => {
    expect(readUciMove('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: undefined });
    expect(readUciMove('a7a8n')).toEqual({ from: 'a7', to: 'a8', promotion: 'N' });
    expect(readUciMove('(none)')).toBeNull();
  });

  it('plays a line out as SAN, castling and checks included', () => {
    const b = board('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
    expect(playLine(b, 'w', ['e1g1', 'g8f6', 'c4f7']).map((m) => m.san)).toEqual(['O-O', 'Nf6', 'Bxf7+']);
    // Stops at the first move that isn't one
    expect(playLine(board(START), 'w', ['e2e4', 'e2e4']).map((m) => m.san)).toEqual(['e4']);
  });

  it('formats scores', () => {
    expect(formatScore({ cp: 34 })).toBe('+0.3');
    expect(formatScore({ cp: -120 })).toBe('-1.2');
    expect(formatScore({ mate: -2 })).toBe('#-2');
    expect(winChance({ cp: 0 })).toBe(0);
    expect(winChance({ mate: 4 })).toBe(1);
    expect(winChance({ cp: 300 })).toBeGreaterThan(0.5);
  });
});

describe('FEN for the engine', () => {
  it('writes the start position as it is', () => {
    expect(boardToFen(board(START), 'w', 1)).toBe(START);
  });

  it('keeps an en passant square', () => {
    const after = applyMove(board(START), 'e2', 'e4');
    expect(boardToFen(after, 'b', 1)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  });

  it('only claims castling the pieces still allow', () => {
    // KQkq claimed, but White's h-rook and Black's king have moved
    const b = board('rnbq1bnr/ppppkppp/8/4p3/4P3/8/PPPPPPPP/RNBQKBN1 w KQkq - 0 1');
    expect(boardToFen(b, 'w', 3).split(' ')[2]).toBe('Q');
  });
});

describe('marking a game', () => {
  it('marks a drop in winning chances at Lichess\'s thresholds', () => {
    // White's move from level to these scores; winning chances drop by about 0.09, 0.11, 0.21, 0.31
    expect(judge({ cp: 0 }, { cp: -50 }, 'w')).toBe(null);
    expect(judge({ cp: 0 }, { cp: -60 }, 'w')).toBe('?!');
    expect(judge({ cp: 0 }, { cp: -120 }, 'w')).toBe('?');
    expect(judge({ cp: 0 }, { cp: -180 }, 'w')).toBe('??');
    // The same drop is judged from Black's side when Black moves
    expect(judge({ cp: 0 }, { cp: 180 }, 'b')).toBe('??');
    expect(judge({ cp: 0 }, { cp: -180 }, 'b')).toBe(null);
  });

  it('marks too little when far ahead, as winning chances flatten out', () => {
    // +10 to +7 is still winning
    expect(judge({ cp: 1000 }, { cp: 700 }, 'w')).toBe(null);
  });

  it('allowing a mate is ?? unless already lost', () => {
    expect(judge({ cp: 30 }, { mate: -2 }, 'w')).toBe('??');
    expect(judge({ cp: -800 }, { mate: -2 }, 'w')).toBe('?');
    expect(judge({ cp: -1200 }, { mate: -2 }, 'w')).toBe('?!');
    expect(judge({ cp: -30 }, { mate: 2 }, 'b')).toBe('??');
  });

  it('letting a mate slip is ?? unless still far ahead', () => {
    expect(judge({ mate: 3 }, { cp: 200 }, 'w')).toBe('??');
    expect(judge({ mate: 3 }, { cp: 800 }, 'w')).toBe('?');
    expect(judge({ mate: 3 }, { cp: 1500 }, 'w')).toBe('?!');
    expect(judge({ mate: 3 }, { mate: -4 }, 'w')).toBe('??');
    expect(judge({ mate: -3 }, { cp: -200 }, 'b')).toBe('??');
  });

  it('delivering mate, or a slower mate, is not marked', () => {
    expect(judge({ mate: 1 }, { mate: 0 }, 'w')).toBe(null);
    expect(judge({ mate: 2 }, { mate: 4 }, 'w')).toBe(null);
    expect(judge({ mate: -1 }, { mate: 0 }, 'b')).toBe(null);
  });

  it('stalemating a won game is ??', () => {
    expect(judge({ mate: 2 }, { cp: 0 }, 'w')).toBe('??');
    expect(judge({ cp: 900 }, { cp: 0 }, 'w')).toBe('??');
  });

  it('marks every move, counted for each side', () => {
    // 1.e4 (fine) e5 (fine) 2.Qh5 (?) Nc6 (fine) 3.Bc4 (fine) Nf6?? 4.Qxf7#
    const evals = [{ cp: 20 }, { cp: 30 }, { cp: 25 }, { cp: -90 }, { cp: -80 }, { cp: -70 }, { mate: 1 }, { mate: 0 }];
    const marks = markMoves(evals);
    expect(marks).toEqual([null, null, '?', null, null, '??', null]);
    expect(countMarks(marks)).toEqual({ inaccuracies: [0, 0], mistakes: [1, 0], blunders: [0, 1] });
  });

  it('a checkmated side has lost, whoever it is', () => {
    expect(whiteChance({ mate: 0 }, 'b')).toBe(1);
    expect(whiteChance({ mate: 0 }, 'w')).toBe(-1);
    expect(whiteChance({ cp: 0 }, 'w')).toBe(0);
  });
});

describe('a game\'s positions', () => {
  it('lists every position, and knows a checkmate when the game ends in one', () => {
    const positions = gamePositions('1. f3 e5 2. g4 Qh4# 0-1');
    expect(positions.length).toBe(5);
    expect(positions[0]).toEqual({ fen: START, color: 'w', over: null });
    expect(positions[1].color).toBe('b');
    expect(positions[4].color).toBe('w');
    expect(positions[4].over).toEqual({ mate: 0 });
  });

  it('knows a stalemate', () => {
    // Sam Loyd's ten-move stalemate
    const positions = gamePositions('1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. h4 Rah6 5. Qxc7 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2');
    expect(positions.length).toBe(20);
    expect(positions.at(-1)?.over).toEqual({ cp: 0 });
    expect(positions.slice(0, -1).every((p) => p.over === null)).toBe(true);
  });
});
