import { describe, it, expect } from 'vitest';
import {
  CENTRE_SQUARES, CHOICES, PIECE_KINDS, ROUND_LENGTH, makeRound, moveArrows,
} from '$lib/components/pieces/match-moves';

/*
  Match the Moves shows one piece and four boards of arrows. These check that
  every question has exactly one right board and that no two boards look alike.
*/

describe('match the moves', () => {
  it('every round is fair', () => {
    for (let n = 0; n < 500; n++) {
      const round = makeRound();
      expect(round).toHaveLength(ROUND_LENGTH);
      for (const [i, q] of round.entries()) {
        expect(new Set(q.choices).size).toBe(CHOICES);
        expect(q.choices).toContain(q.answer);
        expect(CENTRE_SQUARES).toContain(q.origin);
        if (i > 0) expect(q.answer).not.toBe(round[i - 1].answer);
      }
      expect(new Set(round.map((q) => q.answer)).size).toBe(PIECE_KINDS.length);
    }
  });

  it('no two pieces draw the same arrows', () => {
    for (const origin of CENTRE_SQUARES) {
      const drawn = PIECE_KINDS.map((piece) =>
        moveArrows(piece, origin).map((a) => a.to).sort().join(' '),
      );
      for (const arrows of drawn) expect(arrows).not.toBe('');
      expect(new Set(drawn).size).toBe(PIECE_KINDS.length);
    }
  });
});
