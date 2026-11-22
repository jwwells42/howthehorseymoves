# How The Horsey Moves

A free, open-source chess trainer for young students learning how each piece moves. **All of this is with LLM help so except for this sentence expect everything to be impossibly cringe.**

Built for classroom use — no chat, no ads, no memberships. A teacher introduces chess in a lesson, and students practice the basics here afterward. Designed for settings where one teacher supports ~20 students and can't sit with each one individually.

**Live at:** [howthehorseymoves.net](https://howthehorseymoves.net)

## What it does

- **The path** — the home page is 14 levels, each a handful of cards that ends with a bot to beat. A knight marks the next card. Nothing is locked; the hubs in the nav bar open everything directly
- **Basics** — progressive puzzles for each piece (rook, bishop, queen, king, knight, pawn), plus castling, en passant, Match the Moves, a timed coordinate trainer, and a piece placement trainer
- **How to Win** — guided lesson covering check, checkmate, and stalemate with interactive practice
- **Checkmate patterns** — queen takes f7, queen-bishop battery, Lolli's mate, smothered mate, back rank mate, rook ladder, queen & king, mate in 1, mate in 2
- **Tactics** — pins, skewers, forks, removing the defender, discovered attacks (hand-authored instruction + Lichess practice puzzles)
- **Endings** — King + Pawn vs King to win and to defend (bitbase-powered perfect play), mate conversion (KQK, KRRK, KRK, KBBK, KBNK), Lucena, Philidor, wrong bishop, Réti, pawn races, and a pawn endings lesson
- **Vision** — 22 visualization trainers: color of square, same diagonal, knight routes, knight squares, piece reachability, flash position, move counting, blindfold checkmates, and more
- **Play vs computer** — a fourteen-rung ladder of animal opponents, from The Sloth (random moves) up to The Owl (opening book + three-move lookahead), each with an animated avatar. One opponent ends each level; beating one earns a trophy
- **Openings** — the teacher's own repertoires (1.e4 and 1.d4 Mainline Starter, Slav, c6 Qb6 vs London, Scholar's Mate), learned move by move with arrow hints: Flow to watch, Learn (breadth or depth first), and Review on a spaced schedule, with an optional blindfold mode where moves are typed
- **Model games** — 12 games (Fool's Mate to the Game of the Century) with a move-by-move viewer, annotations, variations, and a test mode to reproduce games from memory
- **Analysis board** (`/analysis`) — play moves or paste a PGN, with Stockfish 19 running in the browser (no outside service, so it works on networks that block engine APIs)
- **Star ratings** — 1-3 stars based on move efficiency, shown as mastery badges when all puzzles in a set are completed
- **Sequential puzzles** — within a set, solve a puzzle to open the next one
- **Sound effects** — move, correct, wrong, and star sounds with a mute toggle
- **No accounts** — progress saves to the browser (localStorage)
- **Breathwork** (`/breathwork`) — a standalone, non-chess extra: a guided breathing trainer (resonance breathing + the cyclic physiological sigh) for performance-coaching students. Not linked from the chess nav
- **The Probabilitizer** (`/probabilitizer`) — a standalone opening-odds explorer: play or paste a line and see the cumulative chance of the whole line arising from the start (split by which side you play), using the Lichess opening explorer. Requires a one-click "Login with Lichess" (Lichess's explorer now needs authentication). Not linked from the chess nav. Based on [Opening-Explorer-Plus](https://github.com/EikaMikiku/Opening-Explorer-Plus) by EikaMikiku

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run check    # svelte-check (TypeScript + Svelte diagnostics)
npm test         # design rules, every puzzle loads, progress is never lost, and more
```

Requires Node.js 22.12 or newer (Vercel runs Node 24).

## Adding content

**Puzzles** live in `src/lib/puzzles/`, one file per concept, easy to hard. Each file exports an array of puzzles. A puzzle's name on the site is its set's name and number ("Rook 3"), so puzzles have no title or instruction. The main types are `route` (navigate to target squares), `puzzle` (Lichess-style tactics from FEN+PGN), and `conversion` (play against a bot to checkmate or promote):

```ts
// Route puzzle — move the piece to the stars, around any walls
{
  type: "route",
  id: "rook-01",
  playerPiece: "R",
  position: [{ piece: "R", color: "w", square: "d1" }],
  walls: [],
  stars: ["d8"],
  starThresholds: { three: 1, two: 2, one: 3 },
}

// Tactic puzzle — FEN position + PGN solution
{
  type: "puzzle",
  id: "lichess-fork-01",
  fen: "8/n4k2/6pp/4Kp2/2b5/p5P1/3R3P/8 w - - 2 49",
  pgn: "1. Rd7+ Ke8 2. Rxa7",
  starThresholds: { three: 2, two: 3, one: 4 },
}
```

The order students meet things in is `src/lib/curriculum.ts`, read top to bottom.

**Model games** live in `src/lib/games/index.ts`. Drop in a PGN string (comments and Lichess `[%cal]` arrows are shown):

```ts
{
  id: "immortal",
  white: "Adolf Anderssen",
  black: "Lionel Kieseritzky",
  event: "London",
  year: 1851,
  result: "1-0",
  pgn: "1.e4 e5 2.f4 exf4 3.Bc4 ...",
}
```

**Opening repertoires** are Lichess study exports, kept as they are in `src/lib/openings/pgn/`. Re-export the study and overwrite the file to update one; students keep their progress.

## Tech stack

- SvelteKit + Svelte 5 (runes mode) + TypeScript (strict)
- Scoped CSS (no Tailwind); every colour and size is a token in `src/app.css`, checked by the tests for contrast and colour blindness
- SVG chess board with drag-and-drop
- Stockfish 19 (the lite single-threaded WebAssembly build) in a Web Worker, served by the site itself
- Runs in the browser: no server code, no database
- Deployed on Vercel (free tier)

## Contributing

Contributions welcome! Ideas for what would help:

- More puzzles (especially beginner-friendly checkmate patterns)
- More model games
- Accessibility improvements
- Mobile UX polish
- Translations

Open an issue to discuss before starting large changes.

## License

[GNU Affero General Public License v3.0](LICENSE) — free to use, modify, and deploy, but if you host a modified version, you must share your source code too. In the spirit of [Lichess](https://lichess.org).

## Acknowledgments

- Chess piece SVGs by [Colin M.L. Burnett](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces) (CC BY-SA 3.0)
- Bot character art from [Kenney's Animal Pack Remastered](https://kenney.nl/assets/animal-pack-remastered) by Kenney Vleugels (CC0)
- Practice puzzles from the [Lichess Puzzle Database](https://database.lichess.org/#puzzles) (CC0)
- [Stockfish](https://stockfishchess.org), in the browser through [Stockfish.js](https://github.com/nmrugg/stockfish.js) by Nathan Rugg (GPL-3.0)
- Typeface [TeX Gyre Adventor](https://www.gust.org.pl/projects/e-foundry/tex-gyre) by the GUST e-foundry (GUST Font License)
- Colours from [Radix Colors](https://github.com/radix-ui/colors) (MIT)
