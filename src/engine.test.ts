import { describe, it, expect } from 'vitest';
import { readInfo, readUciMove, playLine, formatScore, winChance } from '$lib/engine/uci';
import { boardToFen } from '$lib/logic/fen';
import { parseFen, createBoardState } from '$lib/logic/types';
import { applyMove } from '$lib/logic/pgn';

/*
  What the engine says, read right: scores turned to White's side, moves
  turned to SAN, and positions sent to it as FENs it can't choke on.
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
