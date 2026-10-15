import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { mergeSnapshots, mergeValue, coerceSnapshot, type Snapshot } from '$lib/sync/merge';
import { parseOpeningPgn, extractLines } from '$lib/openings';
import { buildPass, KNOWN, NEW, SEEN, type MoveProgress, type MoveState } from '$lib/openings/progress';

vi.mock('$env/dynamic/private', () => ({ env: { SESSION_SECRET: 'test-secret' } }));

/*
  Saved progress: nothing a student earned is ever lost, whether the save
  comes from a tab left open since yesterday, another Chromebook (through
  Lichess login), or both at once.
*/

/** A localStorage that lives in memory, shared like the real one by every "tab". */
function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
  vi.stubGlobal('window', { addEventListener: () => {}, dispatchEvent: () => true });
});

describe('a tab left open', () => {
  it("doesn't save its old copy of puzzle progress over another tab's", async () => {
    vi.resetModules();
    const store = await import('$lib/state/progress-store');
    store.initProgress(); // tab A opens: nothing solved yet

    // Meanwhile tab B solves a puzzle
    localStorage.setItem('horsey-progress', JSON.stringify({ 'rook-1': { completed: true, bestStars: 3, bestMoves: 2 } }));

    // Back in tab A, another puzzle
    store.completePuzzle('rook-2', 2, 4);

    const saved = JSON.parse(localStorage.getItem('horsey-progress')!);
    expect(Object.keys(saved).sort()).toEqual(['rook-1', 'rook-2']);
    expect(get(store.progressState).puzzles['rook-1']?.bestStars).toBe(3);
  });

  it("doesn't lower a best score another tab raised", async () => {
    const { saveBest } = await import('$lib/state/storage');
    localStorage.setItem('coord-best-stars', '3');
    expect(saveBest('coord-best-stars', 1)).toBe(3);
    expect(localStorage.getItem('coord-best-stars')).toBe('3');
    expect(saveBest('coord-best-stars', 3)).toBe(3);
    expect(saveBest('match-moves-best-stars', 2)).toBe(2);
  });
});

describe('merging two copies of progress', () => {
  const a: Snapshot = {
    'horsey-progress': JSON.stringify({
      'rook-1': { completed: true, bestStars: 2, bestMoves: 5 },
      'rook-2': { completed: true, bestStars: 3, bestMoves: 3 },
    }),
    'coord-best-stars': '2',
    'bot-beaten-random': '3',
    'opening-e4-moves': JSON.stringify({ m1: [1, 100], m2: [2, 100] }),
  };
  const b: Snapshot = {
    'horsey-progress': JSON.stringify({
      'rook-1': { completed: true, bestStars: 3, bestMoves: 7 },
      'bishop-1': { completed: true, bestStars: 1, bestMoves: 9 },
    }),
    'coord-best-stars': '3',
    'blindfold-color-best': '14',
    'opening-e4-moves': JSON.stringify({ m1: [2, 200], m2: [0, 50], m3: [1, 10] }),
  };

  it('keeps everything either copy had, at its best', () => {
    const m = mergeSnapshots(a, b);
    expect(JSON.parse(m['horsey-progress'])).toEqual({
      'bishop-1': { completed: true, bestStars: 1, bestMoves: 9 },
      'rook-1': { completed: true, bestStars: 3, bestMoves: 5 },
      'rook-2': { completed: true, bestStars: 3, bestMoves: 3 },
    });
    expect(m['coord-best-stars']).toBe('3');
    expect(m['bot-beaten-random']).toBe('3');
    expect(m['blindfold-color-best']).toBe('14');
    // An opening move: the later save wins, even when it went backwards (start over)
    expect(JSON.parse(m['opening-e4-moves'])).toEqual({ m1: [2, 200], m2: [2, 100], m3: [1, 10] });
    const later = mergeValue('opening-e4-moves', JSON.stringify({ m1: [0, 300] }), m['opening-e4-moves']);
    expect(JSON.parse(later!).m1).toEqual([0, 300]);
  });

  it('gives the same answer in either order, and again when repeated', () => {
    const ab = mergeSnapshots(a, b);
    expect(mergeSnapshots(b, a)).toEqual(ab);
    expect(mergeSnapshots(ab, a)).toEqual(ab);
    expect(mergeSnapshots(ab, ab)).toEqual(ab);
  });

  it('keeps settings on the device and drops junk', () => {
    const m = coerceSnapshot({
      'opening-auto-next': 'true',
      'horsey-muted': 'true',
      'opening-e4-order': 'flow',
      'how-to-win-check-mistakes': '4',
      'coord-best': 12,
      'opening-e4-moves': JSON.stringify({ ok: [1, 5], bad: [7, 5], worse: 'x' }),
      'pawn-endings-lesson-best-stars': '2',
    });
    expect(m).toEqual({
      'opening-e4-moves': JSON.stringify({ ok: [1, 5] }),
      'pawn-endings-lesson-best-stars': '2',
    });
    expect(coerceSnapshot('nonsense')).toEqual({});
    expect(coerceSnapshot([1, 2])).toEqual({});
  });
});

describe('opening passes', () => {
  // White: three lines sharing 1.e4 e5 2.Nf3 Nc6
  const lines = extractLines(parseOpeningPgn('1.e4 e5 2.Nf3 Nc6 3.Bb5 (3.Bc4 Bc5 4.c3) a6 4.Ba4 Nf6 5.O-O'));
  const mine = (i: number) => lines[i].filter((m) => m.colorPlayed === 'w');
  const progressOf = (states: [string, MoveState][]): MoveProgress =>
    Object.fromEntries(states.map(([k, s]) => [k, [s, 1]]));
  const sans = (pass: typeof lines) => pass.map((l) => l.map((m) => m.san).join(' '));

  it('breadth goes a few new moves into each line, and lines that come out the same are one visit', () => {
    expect(sans(buildPass(lines, 'w', 'breadth', 2, {}))).toEqual(['e4 e5 Nf3']);
    expect(sans(buildPass(lines, 'w', 'breadth', 3, {}))).toEqual(['e4 e5 Nf3 Nc6 Bb5', 'e4 e5 Nf3 Nc6 Bc4']);
    // e4 and Nf3 seen: the next visit goes two new moves on from there
    const seen = progressOf(mine(0).slice(0, 2).map((m) => [m.key, SEEN]));
    expect(sans(buildPass(lines, 'w', 'breadth', 2, seen))).toEqual(['e4 e5 Nf3 Nc6 Bb5 a6 Ba4', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3']);
  });

  it('depth plays whole lines not known yet, and every line once all are known', () => {
    expect(buildPass(lines, 'w', 'depth', 3, {})).toHaveLength(2);
    const firstKnown = progressOf(mine(0).map((m) => [m.key, KNOWN]));
    expect(sans(buildPass(lines, 'w', 'depth', 3, firstKnown))).toEqual(['e4 e5 Nf3 Nc6 Bc4 Bc5 c3']);
    const allKnown = progressOf([...mine(0), ...mine(1)].map((m) => [m.key, KNOWN]));
    expect(buildPass(lines, 'w', 'depth', 3, allKnown)).toHaveLength(2);
  });

  it('breadth with nothing new left works like depth', () => {
    const allSeen = progressOf([...mine(0), ...mine(1)].map((m) => [m.key, SEEN]));
    expect(buildPass(lines, 'w', 'breadth', 3, allSeen)).toHaveLength(2);
    expect(buildPass(lines, 'w', 'breadth', 3, {})).not.toEqual(buildPass(lines, 'w', 'depth', 3, {}));
  });

  it('a move reached by another move order is the same move', () => {
    const [x] = extractLines(parseOpeningPgn('1.e4 e5 2.Nf3 Nc6 3.Bc4'));
    const [y] = extractLines(parseOpeningPgn('1.Nf3 Nc6 2.e4 e5 3.Bc4'));
    expect(x[4].key).toBe(y[4].key);
    expect(x[0].key).not.toBe(y[0].key);
    // ...but not when one of them could take en passant and the other can't
    const [p] = extractLines(parseOpeningPgn('1.e4 a6 2.e5 d5 3.Nf3'));
    const [q] = extractLines(parseOpeningPgn('1.e4 d5 2.e5 a6 3.Nf3'));
    expect(p[4].key).not.toBe(q[4].key);
    expect(NEW).toBe(0);
  });
});

describe('the login cookie', () => {
  it('reads back what it issued, and nothing forged or expired', async () => {
    const { issueSession, readSession } = await import('$lib/server/session');
    const token = issueSession('some.user', 1000);
    expect(readSession(token, 2000)).toBe('some.user');
    expect(readSession(token, 1000 + 366 * 24 * 3600 * 1000)).toBeNull();
    expect(readSession(token.slice(0, -2) + (token.endsWith('xx') ? 'yy' : 'xx'), 2000)).toBeNull();
    const [id, expiry, sig] = token.split('.');
    expect(readSession(`${Buffer.from('admin').toString('base64url')}.${expiry}.${sig}`, 2000)).toBeNull();
    expect(readSession(`${id}.${Number(expiry) + 1}.${sig}`, 2000)).toBeNull();
    expect(readSession(undefined)).toBeNull();
    expect(readSession('garbage')).toBeNull();
  });
});
