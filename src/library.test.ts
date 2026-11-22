import { describe, it, expect } from 'vitest';
import { summarize, readTypedLine, filterGames, score, numbered, leagueOf, weekOf, NO_FILTERS, type LibraryGame } from '$lib/library/summary';

/*
  The games library's list: each game read once into a summary, and the
  filters a teacher uses on it (player, side, result, event, dates, opening
  moves typed as a student would).
*/

function game(white: string, black: string, date: string, result: string, moves: string, event = 'League, Week 1'): string {
  return `[Event "${event}"]\n[White "${white}"]\n[Black "${black}"]\n[Date "${date}"]\n[Result "${result}"]\n\n${moves} ${result}`;
}

const PGNS = [
  game('T, Ashton', 'F, William', '2025.10.09', '0-1', '1. e4 c5 2. Nf3 d6 3. Bc4 e6'),
  game('F, William', 'T, Ashton', '2025.10.16', '1-0', '1. d4 d5 2. c4 e6'),
  game('T, Ashton', 'L, Nate', '2025.11.20', '1/2-1/2', '1. e4 e5 2. Nf3 Nc6 3. Bb5', 'League, Week 7'),
  game('R, Ashton', 'L, Nate', '2025.11.20', '1-0', '1. e4 c5 2. Nc3', 'League, Week 7'),
];

const GAMES: LibraryGame[] = PGNS.map((pgn, i) => ({ id: `g${i}`, summary: summarize(pgn).summary }));
const NAMES = new Set(GAMES.flatMap((g) => [g.summary.white, g.summary.black]));
const ids = (list: LibraryGame[]) => list.map((g) => g.id);

describe('the games library', () => {
  it('reads a game into its summary', () => {
    const { summary, identity } = summarize(PGNS[0]);
    expect(summary).toMatchObject({ white: 'T, Ashton', black: 'F, William', date: '2025.10.09', result: '0-1', plies: 6 });
    expect(summary.start).toBe('e4 c5 Nf3 d6 Bc4 e6');
    expect(summary.startSquares.split(' ')[2]).toBe('g1f3');
    expect(identity).toBe(summarize(PGNS[0]).identity);
    expect(identity).not.toBe(summarize(PGNS[1]).identity);
  });

  it('reads opening moves typed any way a student would', () => {
    expect(readTypedLine('1.e4 c5 2.Nf3')).toEqual(['e2e4', 'c7c5', 'g1f3']);
    expect(readTypedLine('e4 c5 nf3')).toEqual(['e2e4', 'c7c5', 'g1f3']);
    expect(readTypedLine('1. e4 c5 2. Qh8')).toBeNull();
    expect(numbered('e4 c5 Nf3 d6 Bc4', 4)).toBe('1.e4 c5 2.Nf3 d6');
  });

  it('filters by player (exactly, or part of a name), side and result', () => {
    const f = { ...NO_FILTERS, player: 'T, Ashton' };
    expect(ids(filterGames(GAMES, f, NAMES))).toEqual(['g0', 'g1', 'g2']);
    expect(ids(filterGames(GAMES, { ...f, side: 'black' }, NAMES))).toEqual(['g1']);
    expect(ids(filterGames(GAMES, { ...f, outcome: 'lost' }, NAMES))).toEqual(['g0', 'g1']);
    expect(ids(filterGames(GAMES, { ...f, outcome: 'drew' }, NAMES))).toEqual(['g2']);
    // Part of a name matches both Ashtons
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, player: 'ashton' }, NAMES))).toEqual(['g0', 'g1', 'g2', 'g3']);
    expect(score(GAMES, 'T, Ashton')).toEqual({ won: 0, drew: 1, lost: 2 });
  });

  it('filters by side and result with no player', () => {
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, side: 'black', outcome: 'won' }, NAMES))).toEqual(['g0']);
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, side: 'white', outcome: 'won' }, NAMES))).toEqual(['g1', 'g3']);
    // Neither: won = someone won
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, outcome: 'won' }, NAMES))).toEqual(['g0', 'g1', 'g3']);
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, outcome: 'drew' }, NAMES))).toEqual(['g2']);
  });

  it('reads a league and its week out of the event', () => {
    expect(leagueOf("Thursday Gambit League Fall'25, Week 10")).toBe("Thursday Gambit League Fall'25");
    expect(leagueOf('Fall 2026 — Thursday 4:30 pm ET, Preseason Week 1')).toBe('Fall 2026 — Thursday 4:30 pm ET');
    expect(leagueOf('Winter 2026 — 6-9 Top Individuals , Week 1')).toBe('Winter 2026 — 6-9 Top Individuals');
    expect(weekOf('Fall 2026 — Thursday 4:30 pm ET, Preseason Week 1')).toBe('Preseason Week 1');
    // Not a league week: the event is its own league
    expect(leagueOf('Rated Blitz game')).toBe('Rated Blitz game');
    expect(weekOf('Rated Blitz game')).toBe('Rated Blitz game');
    expect(leagueOf('Hastings 1895, Round 3')).toBe('Hastings 1895');
  });

  it('filters by league, week, dates and opening moves', () => {
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, event: 'League' }, NAMES))).toEqual(['g0', 'g1', 'g2', 'g3']);
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, event: 'League', week: 'League, Week 7' }, NAMES))).toEqual(['g2', 'g3']);
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, from: '2025-10-10', to: '2025-10-31' }, NAMES))).toEqual(['g1']);
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, moves: '1.e4 c5' }, NAMES))).toEqual(['g0', 'g3']);
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, moves: 'e4 c5 nf3' }, NAMES))).toEqual(['g0']);
    // Moves that can't be played match nothing, rather than everything
    expect(ids(filterGames(GAMES, { ...NO_FILTERS, moves: 'e5' }, NAMES))).toEqual([]);
  });
});
