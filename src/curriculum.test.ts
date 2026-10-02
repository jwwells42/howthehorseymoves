import { describe, it, expect } from 'vitest';
import { CURRICULUM } from '$lib/curriculum';
import { getPuzzlesForPiece } from '$lib/puzzles';

/*
  The landing page shows each level as a grid three cards wide, so a level holds
  nine cards: eight stops and then its bot, the boss of the level, last.
*/

describe('curriculum', () => {
  it('every level fits in nine cards and ends with its bot', () => {
    const wrong: string[] = [];
    for (const chapter of CURRICULUM) {
      const ids = chapter.stops.map((s) => s.id);
      const bots = ids.filter((id) => id.startsWith('play-'));
      if (ids.length > 9) wrong.push(`${chapter.title}: ${ids.length} cards (at most 9)`);
      if (bots.length !== 1 || ids.at(-1) !== bots[0]) {
        wrong.push(`${chapter.title}: the bot must be the one last card (bots: ${bots.join(', ') || 'none'})`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('every stop id is used once and every puzzle set exists', () => {
    const seen = new Set<string>();
    const wrong: string[] = [];
    for (const stop of CURRICULUM.flatMap((c) => c.stops)) {
      if (seen.has(stop.id)) wrong.push(`${stop.id}: used twice`);
      seen.add(stop.id);
      if (stop.progress.type === 'puzzle-set' && !getPuzzlesForPiece(stop.progress.key)) {
        wrong.push(`${stop.id}: no puzzle set "${stop.progress.key}"`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
