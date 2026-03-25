# How The Horsey Moves

A free, open-source chess trainer for young students learning how each piece moves. **All of this is with LLM help so except for this sentence expect everything to be impossibly cringe.**

Built for classroom use — no chat, no ads, no memberships. A teacher introduces chess in a lesson, and students practice the basics here afterward. Designed for settings where one teacher supports ~20 students and can't sit with each one individually.

**Live at:** [howthehorseymoves.net](https://howthehorseymoves.net)

## What it does

- **Basics** — progressive puzzles for each piece (rook, bishop, queen, king, knight, pawn), plus castling, en passant, a timed coordinate trainer, and a piece placement trainer
- **How to Win** — guided lesson covering check, checkmate, and stalemate with interactive practice
- **Checkmate patterns** — back rank, rook ladder, queen-bishop battery, knight on f7, Lolli's mate, queen & king endgames, smothered mate
- **Tactics** — pins, skewers, forks, removing the defender, discovered attacks (hand-authored instruction + Lichess practice puzzles)
- **Endings** — King + Pawn vs King (bitbase-powered perfect defense), mate conversion (KQK, KRRK, KRK), and advanced endings (KBBK, KBNK, Philidor "hold the draw" trainer)
- **Blindfold training** — 20 visualization exercises: color of square, same diagonal, knight routes, knight squares, piece reachability, flash position, move counting, and more
- **Play vs computer** — random bot and basic bot (one-ply evaluation)
- **Openings** — learn opening repertoires move by move with arrow hints
- **Model games** — 13 classical games (Greco through Kasparov) with move-by-move viewer, annotations, variation support, and a test mode to reproduce games from memory
- **Star ratings** — 1-3 stars based on move efficiency, shown as mastery badges when all puzzles in a set are completed
- **Sequential unlock** — complete a puzzle to unlock the next one
- **No accounts** — progress saves to the browser (localStorage)

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run check    # svelte-check (TypeScript + Svelte diagnostics)
```

Requires Node.js 18+.

## Adding content

**Puzzles** live in `src/lib/puzzles/`. Each file exports an array of puzzles. Three types: `route` (navigate to target squares), `puzzle` (Lichess-style tactics from FEN+PGN), and `conversion` (play against a bot to checkmate or promote):

```ts
// Route puzzle — navigate piece to stars, avoid walls
{
  type: "route",
  id: "rook-01",
  title: "Rook Path",
  instruction: "Collect all the stars!",
  playerPiece: "R",
  position: [{ piece: "R", color: "w", square: "a1" }],
  walls: ["d4", "d5"],
  stars: ["a8", "h1"],
  starThresholds: { three: 4, two: 6, one: 8 },
}

// Tactic puzzle — FEN position + PGN solution
{
  type: "puzzle",
  id: "tactics-fork-01",
  title: "Knight Fork",
  instruction: "Win material with a fork!",
  fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
  pgn: "1. Qxf7#",
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

- SvelteKit + Svelte 5 (runes mode) + TypeScript (strict)
- Scoped CSS (no Tailwind)
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
