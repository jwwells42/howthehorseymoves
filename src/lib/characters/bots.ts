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

export const BOT_CHARACTERS: Partial<Record<BotLevel, BotCharacter>> = {
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
};

export function getCharacter(level: BotLevel): BotCharacter | undefined {
  return BOT_CHARACTERS[level];
}
