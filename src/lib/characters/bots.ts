import type { BotLevel } from '$lib/logic/bot';

export interface BotCharacter {
  level: BotLevel;
  name: string;
  avatar: string;
  /** Its colour, a --bot-* custom property from app.css. Apply with style:. */
  color: string;
  reactions: {
    greeting: string[];
    thinking: string[];
    capture: string[];
    captured: string[];
    check: string[];
    checkmate: string[];
    checkmated: string[];
    /** The player gave up. Kind, never gloating — a resigning student already feels it. */
    resign: string[];
    draw: string[];
    move: string[];
  };
}

/**
 * One character per rung of the bot ladder (see `BOT_SPECS` in `logic/bot.ts`).
 * The `BotLevel` key is the *engine*; the character is the persona wrapped around it.
 *
 * Keep the text short and simple — many students can't read yet, so the sprite,
 * the difficulty pips, and the trophy carry the real meaning.
 */
export const BOT_CHARACTERS: Partial<Record<BotLevel, BotCharacter>> = {
  // ── 1. Random ──────────────────────────────────────────────
  random: {
    level: 'random',
    name: 'The Sloth',
    avatar: '/characters/sloth.png',
    color: 'var(--bot-sloth)',
    reactions: {
      greeting: [],
      thinking: [],
      capture: [],
      captured: [],
      check: [],
      checkmate: [],
      checkmated: [],
      resign: [],
      draw: [],
      move: [],
    },
  },

  // ── 2. Greedy ──────────────────────────────────────────────
  greedy: {
    level: 'greedy',
    name: 'The Chick',
    avatar: '/characters/chick.png',
    color: 'var(--bot-chick)',
    reactions: {
      greeting: [],
      thinking: [],
      capture: [],
      captured: [],
      check: [],
      checkmate: [],
      checkmated: [],
      resign: [],
      draw: [],
      move: [],
    },
  },

  // ── 3. Loose ───────────────────────────────────────────────
  loose: {
    level: 'loose',
    name: 'The Frog',
    avatar: '/characters/frog.png',
    color: 'var(--bot-frog)',
    reactions: {
      greeting: [],
      thinking: [],
      capture: [],
      captured: [],
      check: [],
      checkmate: [],
      checkmated: [],
      resign: [],
      draw: [],
      move: [],
    },
  },

  // ── 4. Careful ─────────────────────────────────────────────
  careful: {
    level: 'careful',
    name: 'The Rabbit',
    avatar: '/characters/rabbit.png',
    color: 'var(--bot-rabbit)',
    reactions: {
      greeting: [],
      thinking: [],
      capture: [],
      captured: [],
      check: [],
      checkmate: [],
      checkmated: [],
      resign: [],
      draw: [],
      move: [],
    },
  },

  // ── 5. Basic ───────────────────────────────────────────────
  basic: {
    level: 'basic',
    name: 'The Panda',
    avatar: '/characters/panda.png',
    color: 'var(--bot-panda)',
    reactions: {
      greeting: [],
      thinking: [],
      capture: [],
      captured: [],
      check: [],
      checkmate: [],
      checkmated: [],
      resign: [],
      draw: [],
      move: [],
    },
  },

  // ── 6. Sharp ───────────────────────────────────────────────
  sharp: {
    level: 'sharp',
    name: 'The Monkey',
    avatar: '/characters/monkey.png',
    color: 'var(--bot-monkey)',
    reactions: {
      greeting: [],
      thinking: [],
      capture: [],
      captured: [],
      check: [],
      checkmate: [],
      checkmated: [],
      resign: [],
      draw: [],
      move: [],
    },
  },

  // ── 7. Intermediate ────────────────────────────────────────
  intermediate: {
    level: 'intermediate',
    name: 'The Bear',
    avatar: '/characters/bear.png',
    color: 'var(--bot-bear)',
    reactions: {
      greeting: [],
      thinking: [],
      capture: [],
      captured: [],
      check: [],
      checkmate: [],
      checkmated: [],
      resign: [],
      draw: [],
      move: [],
    },
  },

  // ── 8. Expert ──────────────────────────────────────────────
  expert: {
    level: 'expert',
    name: 'The Owl',
    avatar: '/characters/owl.png',
    color: 'var(--bot-owl)',
    reactions: {
      greeting: [],
      thinking: [],
      capture: [],
      captured: [],
      check: [],
      checkmate: [],
      checkmated: [],
      resign: [],
      draw: [],
      move: [],
    },
  },
};

export function getCharacter(level: BotLevel): BotCharacter | undefined {
  return BOT_CHARACTERS[level];
}
