import type { BotLevel } from '$lib/logic/bot';

export interface BotCharacter {
  level: BotLevel;
  name: string;
  avatar: string;
  color: string;
  description: string;
  reactions: {
    greeting: string[];
    thinking: string[];
    capture: string[];
    captured: string[];
    check: string[];
    checkmate: string[];
    checkmated: string[];
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
    color: '#f59e0b',
    description: 'Plays completely random legal moves. Great for beginners.',
    reactions: {
      greeting: ['Hi!', "Let's play!", 'Ready!'],
      thinking: ['Hmm...', 'Eeny meeny...', 'This one!', 'La la la...'],
      capture: ['Yoink!', 'Mine now!', 'Nom!', 'Got one!'],
      captured: ['Oh no!', 'Hey!', 'Oops!', 'Ow!'],
      check: ['Watch out!', 'Check!', 'Careful!'],
      checkmate: ['I won?!', 'Wow!', 'Really?!'],
      checkmated: ['Good game!', 'You got me!', 'Nice one!', 'Gg!'],
      draw: ['Tie!', 'Draw!', 'We both win!'],
      move: ['Wheee!', 'Here I go!', 'Boop!', 'Zoom!'],
    },
  },

  // ── 2. Greedy ──────────────────────────────────────────────
  greedy: {
    level: 'greedy',
    name: 'The Chick',
    avatar: '/characters/chick.png',
    color: '#facc15',
    description: 'Grabs every piece it can reach — and never checks if it is safe.',
    reactions: {
      greeting: ['Peep peep!', 'Is it snack time?', 'Hungry!'],
      thinking: ['Snack?', 'Sniff sniff...', 'Yummy?', 'Where is food...'],
      capture: ['NOM!', 'Snack!', 'Gulp!', 'Delicious!'],
      captured: ['My snack!', 'Peep!', 'Not fair!', 'Ouch!'],
      check: ['Peep!', 'Look out!', 'Check!'],
      checkmate: ['I ate them all!', 'Peep peep peep!', 'Yum!'],
      checkmated: ['Still full!', 'Good game!', 'You win!', 'Peep.'],
      draw: ['We share!', 'Tie!', 'Half each!'],
      move: ['Peep!', 'Hop!', 'Over here!', 'This way!'],
    },
  },

  // ── 3. Loose ───────────────────────────────────────────────
  loose: {
    level: 'loose',
    name: 'The Frog',
    avatar: '/characters/frog.png',
    color: '#4ade80',
    description: 'Hops around. Sees some good moves, but not the best one.',
    reactions: {
      greeting: ['Ribbit!', 'Hop hop!', 'Hello!'],
      thinking: ['Ribbit...', 'Hmm, hop where?', 'Let me see...', 'Maybe...'],
      capture: ['Gotcha!', 'Snap!', 'My tongue is fast!', 'Ribbit!'],
      captured: ['Croak!', 'Aw!', 'That stings!', 'Hey!'],
      check: ['Ribbit! Check!', 'Watch it!', 'Hop away!'],
      checkmate: ['I hopped to victory!', 'Ribbit!', 'I did it!'],
      checkmated: ['Good hop!', 'You got me!', 'Croak.', 'Well played!'],
      draw: ['A tie!', 'Even!', 'Ribbit, draw!'],
      move: ['Hop!', 'Boing!', 'Splash!', 'Ribbit!'],
    },
  },

  // ── 4. Careful ─────────────────────────────────────────────
  careful: {
    level: 'careful',
    name: 'The Rabbit',
    avatar: '/characters/rabbit.png',
    color: '#f472b6',
    description: 'Quick and careful. Rarely leaves a piece where you can take it.',
    reactions: {
      greeting: ['Hop to it!', 'Hi there!', 'Ready when you are!'],
      thinking: ['Twitch twitch...', 'Thinking fast...', 'Which way?', 'Hmm.'],
      capture: ['Too slow!', 'Got it!', 'Quick paws!', 'Thank you!'],
      captured: ['Eek!', 'My piece!', 'Sneaky!', 'Ouch!'],
      check: ['Check!', 'Careful now!', 'Look at your king!'],
      checkmate: ['Hop hop hooray!', 'I win!', 'Too fast for you!'],
      checkmated: ['You were faster!', 'Good game!', 'Nice hunting!', 'Well done!'],
      draw: ['A draw!', 'Even race!', 'Nobody wins!'],
      move: ['Hop!', 'Zip!', 'Over here!', 'Quick!'],
    },
  },

  // ── 5. Basic ───────────────────────────────────────────────
  basic: {
    level: 'basic',
    name: 'The Panda',
    avatar: '/characters/panda.png',
    color: '#94a3b8',
    description: 'Calm and steady. Takes what you leave and spots mate in one.',
    reactions: {
      greeting: ['Hello, friend.', 'Shall we begin?', 'A good day for chess.'],
      thinking: ['Let me think...', 'Patience...', 'One moment...', 'Considering...'],
      capture: ['Thank you.', 'I will take that.', 'Mine.', 'A gift!'],
      captured: ['Well spotted.', 'Hmm!', 'Fair enough.', 'Oh!'],
      check: ['Check.', 'Your king, please.', 'Careful.'],
      checkmate: ['Checkmate.', 'A good game.', 'That is mate.'],
      checkmated: ['You played well.', 'Well earned!', 'Good game.', 'I am impressed.'],
      draw: ['A fair draw.', 'Even.', 'Nobody wins today.'],
      move: ['There.', 'My move.', 'Steady.', 'Mmm.'],
    },
  },

  // ── 6. Sharp ───────────────────────────────────────────────
  sharp: {
    level: 'sharp',
    name: 'The Monkey',
    avatar: '/characters/monkey.png',
    color: '#fb923c',
    description: 'Cheeky and clever. Looks two moves ahead — but likes to show off.',
    reactions: {
      greeting: ['Ooh ooh!', 'Think you can win?', 'This will be fun!'],
      thinking: ['Ooh, tricky...', 'Two moves ahead...', 'Scheming...', 'Aha?'],
      capture: ['Banana!', 'Swipe!', 'Mine!', 'Thanks for that!'],
      captured: ['Ooh!', 'You saw that?', 'Cheeky!', 'Not bad!'],
      check: ['Check!', 'Eyes on your king!', 'Ooh ooh, check!'],
      checkmate: ['Ooh ooh AH AH!', 'Got you!', 'Told you!'],
      checkmated: ['You outsmarted me!', 'Good game!', 'Ooh. Well played.', 'Again?'],
      draw: ['A draw! Boring.', 'Even!', 'Nobody wins.'],
      move: ['Swing!', 'Watch this!', 'Ooh!', 'Here!'],
    },
  },

  // ── 7. Intermediate ────────────────────────────────────────
  intermediate: {
    level: 'intermediate',
    name: 'The Bear',
    avatar: '/characters/bear.png',
    color: '#a16207',
    description: 'Strong and patient. Looks two moves ahead and never misses a gift.',
    reactions: {
      greeting: ['Let us play.', 'I am ready.', 'Show me what you know.'],
      thinking: ['Hmmm...', 'Calculating...', 'I see it...', 'Deep in thought.'],
      capture: ['Mine.', 'A mistake.', 'I saw that coming.', 'Thank you.'],
      captured: ['Grrr!', 'Clever.', 'You earned that.', 'Hmph!'],
      check: ['Check.', 'Your king is in danger.', 'Watch out.'],
      checkmate: ['Checkmate.', 'The game is mine.', 'Well fought.'],
      checkmated: ['You beat me!', 'Truly well played.', 'A worthy win.', 'Good game.'],
      draw: ['A draw. Fair.', 'Neither of us wins.', 'Even.'],
      move: ['There.', 'My turn.', 'Grr.', 'Done.'],
    },
  },

  // ── 8. Expert ──────────────────────────────────────────────
  expert: {
    level: 'expert',
    name: 'The Owl',
    avatar: '/characters/owl.png',
    color: '#818cf8',
    description: 'Knows the openings by heart and plans two moves ahead. The toughest.',
    reactions: {
      greeting: ['I have been expecting you.', 'Let us see.', 'Begin.'],
      thinking: ['I know this position...', 'Calculating...', 'Interesting...', 'Hoo.'],
      capture: ['As expected.', 'A small error.', 'Mine.', 'I planned that.'],
      captured: ['Hoo! Sharp.', 'You saw it.', 'Impressive.', 'Noted.'],
      check: ['Check.', 'Your king, watch it.', 'Hoo. Check.'],
      checkmate: ['Checkmate.', 'The book was right.', 'It was always coming.'],
      checkmated: ['Remarkable!', 'You have truly learned.', 'I salute you.', 'A fine game.'],
      draw: ['A draw. Respectable.', 'Balanced.', 'Neither falls.'],
      move: ['Hoo.', 'As planned.', 'There.', 'Naturally.'],
    },
  },
};

export function getCharacter(level: BotLevel): BotCharacter | undefined {
  return BOT_CHARACTERS[level];
}
