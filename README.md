# How The Horsey Moves

A free, open-source chess trainer for young students learning how each piece moves. **All of this is with LLM help so except for this sentence expect everything to be impossibly cringe.**

Built for classroom use — no chat, no ads, no memberships. A teacher introduces chess in a lesson, and students practice the basics here afterward. Designed for settings where one teacher supports ~20 students and can't sit with each one individually.

**Live at:** [howthehorseymoves.vercel.app](https://howthehorseymoves.vercel.app)

## What it does

- **Progressive puzzles** for each piece — rook, bishop, queen, king, knight, pawn
- **Special moves** — castling, en passant
- **Checkmate patterns** — back rank, rook ladder, queen-bishop battery, knight on f7, Lolli's mate, queen & king endgames, smothered mate
- **Play vs computer** — random-move bot for practice games
- **Model games** — step through famous games move by move (PGN format)
- **Star ratings** — 1-3 stars based on move efficiency
- **Sequential unlock** — complete a puzzle to unlock the next one
- **No accounts** — progress saves to the browser (localStorage)

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

Requires Node.js 18+.

## Adding content

**Puzzles** live in `src/lib/puzzles/`. Each file exports an array of puzzles. Positions can be defined as piece-by-piece JSON or as a [FEN string](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation):

```ts
{
  id: "my-puzzle-01",
  piece: "R",
  title: "Rook Checkmate",
  instruction: "Deliver checkmate with the rook!",
  setup: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
  targets: [],
  solution: ["a8"],
  mode: "checkmate",
  maxMoves: 1,
  starThresholds: { three: 1, two: 2, one: 3 },
}
```

**Model games** live in `src/lib/games/index.ts`. Drop in a PGN string:

```ts
{
  id: "immortal",
  white: "Adolf Anderssen",
  black: "Lionel Kieseritzky",
  event: "London",
  year: 1851,
  result: "1-0",
  pgn: "1.e4 e5 2.f4 exf4 3.Bc4 ...",
  description: "The Immortal Game.",
}
```

## Tech stack

- Next.js 16 + React 19 + TypeScript (strict)
- Tailwind CSS 4
- SVG chess board with drag-and-drop
- No backend — everything runs client-side
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
