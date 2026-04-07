# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"How The Horsey Moves" — a free, open-source chess puzzle trainer for young students in classroom settings. Built with SvelteKit (Svelte 5 runes) + TypeScript (strict mode). No chat, no ads, no memberships, no server compute — everything is client-side. Deployed to Vercel.

## Commands

```bash
npm run dev          # Dev server at localhost:5173
npm run build        # Production build
npm run check        # TypeScript + Svelte diagnostics (svelte-kit sync + svelte-check)
```

No test framework is configured.

## Architecture

**Three-layer design**: chess logic → state management → Svelte UI.

### Chess Logic (`src/lib/logic/`)
- `types.ts` — Core types: `PieceKind`, `PieceColor`, `SquareId` (union of all 64 squares), `BoardState` (Map-based, immutable). FEN parser via `parseFen()`. Position hashing via `boardToKey()` (used for threefold repetition)
- `moves.ts` — Pure functions for move generation per piece type. Sliding pieces (R/B/Q) use direction arrays; step pieces (K/N) use offset arrays; pawns have special forward/capture/en-passant logic
- `attacks.ts` — `isSquareAttacked()`, `isInCheck()`, `isCheckmate()`, `isStalemate()`, `getLegalMoves()`, `getAllLegalMoves()`
- `pgn.ts` — PGN parsers. Flat `parsePgn()` for simple move lists; tree-based `parseGamePgn()` → `GameTree`/`GameNode` with full variation support (`(...)` syntax), comments, NAGs, arrows. `extractMainLine(tree)` flattens to `ParsedGame` for backward compat / test mode. Exports `parseSan()` and `applyMove()` (also used by openings parser). Supports comments (`{text}`), NAGs (`!`, `!!`), arrows (`[%cal Ge2e4]`)
- `bot.ts` — Bot move selection: `pickBotMove(board, color, level)`. `"random"` = any legal move; `"basic"` = one-ply scored evaluation; `"intermediate"` = depth-2 minimax with alpha-beta pruning
- `endgame.ts` — Mate conversion logic for KQK, KRRK, KRK, KBBK, KBNK endgames

### Puzzle System (`src/lib/puzzles/`)
- `types.ts` — Discriminated union `Puzzle = RoutePuzzle | TacticPuzzle | ConversionPuzzle`:
  - `RoutePuzzle` (`type: "route"`) — navigate a piece to target stars, avoid walls. Has `playerPiece`, `position`, `walls`, `stars`, `starThresholds`, optional `arrows`/`threats`
  - `TacticPuzzle` (`type: "puzzle"`) — Lichess-style FEN+PGN tactic. Has `fen`, `pgn`, optional `demo`/`starThresholds`
  - `ConversionPuzzle` (`type: "conversion"`) — play against a bot to checkmate or promote. Has `position`, `bot`, `goal`, `starThresholds`
- Per-piece files (`rook.ts`, `bishop.ts`, etc.) + `castling.ts`, `enpassant.ts`, `checkmate.ts`, `tactics.ts`, `lucena.ts`, `reti.ts`, `pawn-races.ts`
- `index.ts` — Registry with `getPuzzlesForPiece()`, `PIECES`, `CATEGORIES` (with `comingSoon` support for subcategories)

### Curriculum (`src/lib/curriculum.ts`)
- Defines `CURRICULUM: CurriculumChapter[]` — 8 levels with ~9 stops each, mapping the full learning path
- Each `CurriculumStop` has `id`, `name`, `icon`, `href`, and `progress` source (puzzle-set, localStorage key, or none)
- Helper functions: `getStopStars()`, `getAllStopStars()`, `getFirstIncompleteId()` for progress tracking
- Used by landing page `CurriculumPath` component to render the winding trail UI

### Model Games (`src/lib/games/`)
- `types.ts` — `ModelGame` interface
- `index.ts` — 14 classical games (Greco through Kasparov) with PGN strings. Most are unannotated — user annotates via Lichess studies, then pastes PGN with `{comments}` and `[%cal ...]` arrows

### Opening Trainer (`src/lib/openings/`)
- `index.ts` — PGN variation parser (`parseOpeningPgn`), line extractor, opening data
- Parses `(variation)` syntax into a tree, extracts all root-to-leaf lines
- Student plays one color; opponent moves auto-play with animation
- Learn mode: arrows show each move. Practice mode: arrows only on mistakes

### State (`src/lib/state/`)
- `progress-store.ts` — Svelte writable store, persists to localStorage (`"horsey-progress"`). Sequential unlock: puzzle N requires N-1 completed
- `use-puzzle.svelte.ts` — State factory for gameplay: board state, move validation, drag-and-drop, star calculation, side-effects, multi-step solution validation
- `use-game.svelte.ts` — State factory for Play vs Computer: castling, promotion, bot moves, threefold repetition detection via `boardToKey()`
- `sound.ts` — WAV file playback (`/sounds/*.wav`) with mute toggle persisted to localStorage. Four sounds: `move`, `correct`, `wrong`, `stars`. Used by puzzles, game, and endgame trainers

### Components (`src/lib/components/`)
- `board/Board.svelte` — SVG-based 800x800 board with drag-and-drop, click-to-move, valid move indicators, target stars, arrows, slide animations, danger-square overlays. `readOnly` prop skips animations (used by game viewer). `playableColors` prop allows playing both sides (used by game viewer test mode). `dangerSquares` prop highlights squares with red semi-transparent overlay
- `board/CoordinateTrainer.svelte` — Timed 30s square-naming mini-game. Stars: 3 for 10+, 2 for 5+, 1 for 3+. Best score/stars persisted to localStorage (`coord-best`, `coord-best-stars`). Standalone from puzzle progress system
- `board/SetupTrainer.svelte` — 7 stages: place rooks, knights, bishops, king, queen, pawns, then full setup. Each stage individually addressable via `/setup/[stage]`. Exports `SETUP_STAGES` via `<script module>`. Supports click-click and drag-from-tray. Stars based on mistakes: 0=3, 1-2=2, 3+=1. Per-stage localStorage: `setup-{slug}-best-stars`
- `puzzle/PuzzleShell.svelte` — Main puzzle container. Hides target stars when `puzzle.arrows` is set
- `game/GameViewer.svelte` — PGN game viewer with path-based navigation (`currentPath: GameNode[]`), auto-play, keyboard nav (`<svelte:window>`), comments, arrows. Variations display inline in the move grid. "Pause at variations" toggle stops auto-play at branch points. Test mode uses `extractMainLine()` for flat main-line-only memorization
- `game/PgnExplorer.svelte` — Lightweight PGN explorer for embedding annotated move trees. Takes `pgn` + optional `fen` props, renders board + clickable move grid with variations, comments, and keyboard nav. Used by PawnEndingsLesson to show post-quiz analysis. Reuses `parseGamePgn()` tree + same move-grid visual pattern as GameViewer but without test/autoplay/explore modes
- `game/GameShell.svelte` — Play vs Computer wrapper, accepts `botLevel` prop
- `opening/OpeningTrainer.svelte` — Opening repertoire trainer with learn/practice phases
- `endgame/EndgameShell.svelte` — KPK bitbase trainer (`src/lib/logic/kpk-bitbase.ts`: 24KB retrograde analysis). Bot plays perfect defense via bitbase; validates student moves must maintain winning evaluation. Win condition: pawn reaches rank 8. Stars: 0 mistakes=3, 1=2, 2+=1
- `endgame/MateTrainer.svelte` — Mate conversion trainer (KQK, KRRK, KRK, KBBK, KBNK)
- `endgame/DrawTrainer.svelte` — "Hold the draw" trainer. Student plays Black (defender), bot plays White (attacker). Supports `botStrategy` prop: `'heuristic'` (default, simple evaluation) or `'bitbase-kpk'` (perfect play via KPK bitbase). Win = draw achieved (stalemate, threefold repetition, 50-move rule). Lose = checkmate or clean promotion. Uses `boardToKey()` for threefold detection. Optional `onNext` callback for lesson flow integration
- `lessons/PawnEndingsLesson.svelte` + `pawn-endings-data.ts` — Multi-step pawn endings lesson with 3 step types: `DiagramStep` (static board + key squares/arrows), `QuizStep` (animate intro, ask "what will be the result?", animate proof), `TrainerStep` (inline EndgameShell or DrawTrainer). QuizStep supports optional `annotatedPgn` field — when present, an "Explore" button after the result toggles a PgnExplorer with variations and comments. Sections: Rule of the Square, Key Squares, Opposition, Outside Passed Pawn, Breakthrough, Trebuchet, Guard the Entry, Play It Out (KPK Convert + Defend)
- `lessons/HowToWinLesson.svelte` + `how-to-win-data.ts` — 15-step guided lesson: check → escaping check (move/capture/block) → giving check → checkmate demo → stalemate demo → 5 mate-in-1 practice → 2 don't-stalemate practice. Validation modes: "any", "check", "checkmate", "no-stalemate". Stars based on mistakes. localStorage: `how-to-win-best-stars`
- `nav/NavBar.svelte` — Sticky top nav with sections: Learn, Tactics, Checkmates, Endings, Play, Vision. Responsive title (text on wide screens, favicon on narrow via CSS media query at 640px). `isActive()` logic: each hub claims its routes, Learn catches the rest
- `blindfold/` — 19 blindfold/visualization components (23 trainers total — BlindfoldMate handles 5 endgame types), all standalone localStorage keys. Includes: ColorOfSquare, SameDiagonal, SameRankFile, MoveCounting, KnightRoutes, BishopRoutes, PieceReachability, NeighborSquares, KnightSquares, WhatChanged, WhereDidItLand, FlashPosition, PieceCount, RookMaze, BlindTactics, BlindfoldPuzzle, KnightGauntlet, GuardingGame, BlindfoldMate

### Routing (`src/routes/`)
- `/` — Landing page with curriculum path
- `/tactics` — Tactics hub (pins, forks, skewers, etc.)
- `/checkmates` — Checkmate patterns hub
- `/endings` — Endings hub (basic + advanced endings, pawn endings lesson, KPK defend)
- `/vision` — Vision hub (25 blindfold/visualization trainers, including coordinate trainer)
- `/learn/[piece]` — Puzzle list, category hub, endgame trainers, blindfold trainers, How to Win hub/sections
- `/learn/[piece]/[puzzleId]` — Individual puzzle or How to Win lesson step
- `/board` — Board hub; `/board/coordinates` — Coordinate trainer
- `/setup` — Place the Pieces stage list; `/setup/[stage]` — individual stage
- `/games`, `/games/[gameId]` — Model game viewer
- `/openings`, `/openings/[id]` — Opening repertoire trainer
- `/play` — Play vs computer
- `/editor` — Puzzle creator (place pieces, generate FEN strings)
- `/about` — Privacy, COPPA, credits, license, administrator info

### Lichess Puzzles (`src/lib/puzzles/lichess-*.ts`)
- Practice puzzles sourced from the Lichess puzzle database (CC0 public domain)
- Generated by `scripts/filter-lichess.py` from the full 5.8M puzzle CSV
- Filtered by: rating < 1200 (1200-1800 for pawn endings), white-to-move only, low piece count, same piece type across all player moves (except pawnEndgame which allows mixed K+P)
- 8 generated files: `lichess-mate1.ts`, `lichess-mate2.ts`, `lichess-forks.ts`, `lichess-skewers.ts`, `lichess-pins.ts`, `lichess-removing-defender.ts`, `lichess-discovered.ts`, `lichess-pawn-endings.ts`
- `pawnEndgame` category filters for positions with only kings and pawns on the board (`pawns_only` flag)
- Integrated into the standard puzzle system via `PuzzleShell` — no separate trainer component
- Lichess pins are appended after hand-authored pin puzzles in the same puzzle set
- To regenerate: download `lichess_db_puzzle.csv.zst` from database.lichess.org, decompress to `data/lichess_db_puzzle.csv` (gitignored), run `python3 scripts/filter-lichess.py data/lichess_db_puzzle.csv` with python-chess in a venv

## Deployment

Vercel auto-deploys on `git push` — no manual deployment steps needed. Uses `@sveltejs/adapter-vercel` with `runtime: 'nodejs22.x'`.

## Svelte 5 Conventions

This codebase uses **Svelte 5 runes mode** exclusively. Follow these patterns:

### State & Reactivity
- **`$state()`** for reactive variables: `let count = $state(0)`
- **`$state.raw()`** for arrays/objects where you need reference equality (`===`) on contents. `$state()` deep-proxies contents, so `stateArray[i] === rawObj` is always false. Use `$state.raw()` when the array is replaced wholesale (not mutated in place) and its elements are compared by reference elsewhere (e.g., parsed tree nodes, path arrays). Reassignment is still tracked; only deep property tracking is skipped
- **Typed state** uses generic syntax: `let items = $state<string[]>([])` — NOT `let items: string[] = $state([])`
- **`$derived()`** for computed values: `let doubled = $derived(count * 2)`
- **`$derived.by()`** for complex computations that need a function body
- **`$effect()`** for side effects (DOM updates, timers, localStorage). Avoid updating state inside effects — use `$derived` instead
- **`onMount()`** for one-time browser-only initialization (localStorage reads, interval setup with cleanup)
- **`$props()`** for component inputs: `let { piece, onNext }: Props = $props()`

### Components
- **Dynamic components**: use a PascalCase variable directly as a tag — `<MyComponent />`. Do NOT use `<svelte:component this={...}>` (deprecated in runes mode). Variable names MUST start with a capital letter for Svelte to treat them as components
- **Props interface**: declare with `interface Props { ... }` then destructure with `$props()`
- **`{#key value}`** blocks to force re-mount when a value changes (replaces React's `key` prop)
- **Component-level exports**: use `<script lang="ts" module>` for non-component exports (e.g., `SETUP_STAGES`). For larger data exports, use separate `.ts` files
- **Self-closing tags**: `<Component />` is fine for components; for HTML elements use `<div></div>`

### Styling
- **Scoped CSS** in `<style>` blocks — no Tailwind
- **Conditional classes** use array syntax (Svelte 5.16+): `class={['card', isActive && 'active']}` — NOT `class:active={isActive}` (legacy directive)
- CSS custom properties for theming: `--background`, `--foreground`, `--card-bg`, `--card-border`, `--text-muted`, `--text-faint`, `--btn-bg`, `--btn-hover`

### Events & DOM
- **Event handlers**: `onclick`, `onkeydown`, `onsubmit` — NOT `on:click` (Svelte 4 syntax)
- **SVG a11y**: interactive SVGs need `role="application"` and `aria-label`; display-only SVGs need `role="img"` and `aria-label`. Never suppress a11y warnings with `svelte-ignore` — fix the underlying accessibility issue instead
- **Keyboard nav**: use `<svelte:window onkeydown={handler} />` for global keyboard shortcuts

### Imports
- **`import type { X }`** for type-only imports (prevents Rollup "not exported" warnings)
- **Path alias**: `$lib/` maps to `src/lib/`
- Static assets live in `static/` (not `public/`)

### Translation Cheatsheet (React → Svelte 5)

| React/Next.js | SvelteKit (Svelte 5) |
|---|---|
| `useState(x)` | `let x = $state(x)` |
| `useState<Type>(x)` | `let x = $state<Type>(x)` |
| `useCallback(fn, [deps])` | `function fn() { ... }` |
| `useEffect(() => { ... }, [deps])` | `$effect(() => { ... })` |
| `useMemo(() => val, [deps])` | `let val = $derived(...)` |
| `useRef(null)` | `let el = $state<El \| null>(null)` + `bind:this={el}` |
| `useContext(Ctx)` | `import { store } from '$lib/state/...'` |
| `className="x"` | `class="x"` or `class={['x', cond && 'y']}` |
| `Link href="/x"` | `<a href="/x">` |
| `use(params)` | `page.params` via `$app/state` |
| `useRouter().push(x)` | `goto(x)` via `$app/navigation` |
| `"use client"` | Not needed |
| `@/lib/foo` | `$lib/foo` |
| `key={id}` | `{#key id}...{/key}` |

## Key Conventions

- Many students using this app cannot read yet. All interactive elements (puzzles, lessons, trainers) should be figure-out-able from visual cues alone: arrows, colors, icons, and board state. Text instructions are helpful for those who can read but must not be the only signal. Use universal symbols (trophies, checkmarks, red/green colors) over text labels
- Landing page shows a curriculum path: 8 levels with ~9 stops each, rendered as a winding trail. Knight marker sits on the first incomplete stop. "Continue" button links to it. Everything is unlocked (no gating). Nav bar hubs (Practice, Study, Vision, etc.) remain for direct access
- Castling puzzles are merged into King, en passant puzzles are merged into Pawn (source files remain separate: `castling.ts`, `enpassant.ts` — combined in `index.ts` registry)
- Play page accepts `?level=random` or `?level=basic` query param to skip the level selector
- Stars on category/piece cards only show when ALL puzzles in that set are completed (mastery indicator, not best-single-puzzle)
- The Board must appear at the same size and position on screen at all times within a page. Mode switches (e.g., viewer ↔ test mode) must not cause the board to shift or resize
- Board state is immutable — new `BoardState` created per move, never mutated
- Chess piece SVGs live in `static/pieces/` named `{color}{piece}.svg` (e.g., `wR.svg`, `bN.svg`)
- No backend/database — all state is client-side localStorage
- Obstacle pieces on puzzles are white pawns (so they can't be captured by the player's white piece)
- Puzzle `setup` accepts either a `PiecePlacement[]` array or a FEN string
- FEN strings auto-extract castling rights and en passant square from fields 3-4
- This codebase is designed to be hand-maintained by a human chess teacher — prefer simple, readable formats
- Avoid `eslint-disable` and `svelte-ignore` comments — fix the root cause instead

## Workflow

- After completing a task, always offer to commit and push so Vercel can deploy
- Run `npm run build` before committing to catch errors early
- Run `npm run check` to catch type errors and Svelte warnings that the build doesn't flag
- The user often makes hand-edits to puzzle files while Claude works — always `git diff --stat` before committing and include their changed files
- When pushing fails due to remote changes, `git pull --rebase` then push again
- Do NOT try to programmatically verify checkmate positions — push and let the user test in-browser
- Claude generates PGNs from memory and they often contain errors (wrong moves mid-game). Always flag generated PGNs as needing user verification. Major chess databases (chessgames.com, Wikipedia, 365chess) block WebFetch (403), but smaller sites may work. If a PGN fails parsing, diagnose the exact failing move and let the user fix it rather than burning tokens on speculative web searches
- PGN annotations: `{comments}`, NAGs (`!`, `!!`), arrows (`[%cal Ge2e4]`). Lichess color convention: G=green, R=red, Y=yellow, B=blue
- When adding new components, routes, or significant features, update the relevant sections of this CLAUDE.md file so future conversations don't need to re-read code to discover what exists

## Puzzle Authoring Notes

- The user is a chess teacher — puzzle accuracy matters. When creating checkmate puzzles, carefully trace all king escape squares
- Claude can help with puzzle infrastructure (multi-move support, opponent responses, arrows, UI) but the user should verify chess positions for tactical correctness
- Tactics puzzles use arrows (not target stars) to show tactical relationships, and `opponentResponses` for multi-move sequences
- Subcategories can be marked `comingSoon: true` in CATEGORIES to show as grayed-out placeholders
- Checkmate categories: Queen Takes f7, Queen-Bishop Battery, Lolli's Mate, Smothered Mate, Back Rank Mate, Rook Ladder, Queen & King, Mate in 1, Mate in 2
- Tactics categories: Pins, Skewers, Forks, Removing the Defender, Discovered Attacks — all have Lichess practice puzzles
- Puzzle IDs use a prefix matching their category (e.g., `tactics-pin-01`, `checkmate-qb-01`, `lichess-fork-01`)
- Blindfold trainers all use standalone localStorage keys (not puzzle progress system)

## Opening Trainer Notes

- PGN with variations: `1.e4 e5 2.Nf3 Nc6 (2...d6 3.d4) 3.Bb5` — parenthesized sections are alternative lines
- Student plays one side (white), opponent auto-responds
- Lines are trained sequentially: main line first, then variations rewind to branch point
- Learn phase shows arrows; practice phase hides them unless the student makes a mistake

## Bot System (`src/lib/logic/bot.ts`)

- Three levels: `"random"` (any legal move), `"basic"` (one-ply evaluation), and `"intermediate"` (depth-2 minimax with alpha-beta pruning)
- Basic bot scores each legal move by: captures (trade up), checkmate delivery (+1000), checkmate defense (-500 if move allows opponent mate-in-1), piece safety, check bonus, center control, castling, pawn advancement
- Intermediate bot: depth-2 minimax search with alpha-beta pruning. Uses piece-square tables (standard simplified PSTs from Chess Programming Wiki) for static evaluation. Handles promotion, castling, and en passant in move simulation. Captures sorted first for better pruning (~35×35 = ~1,225 positions worst case, typically much less with pruning). Instant on Chromebooks
- `createGameState(botLevel)` in `use-game.svelte.ts` creates the game state factory; `GameShell` passes it through
- Play page (`/play`) shows a level selector before starting the game
- Adding new levels: add to `BotLevel` type, handle in `pickBotMove()`
- Promotion: player gets a picker overlay (Q/R/B/N) when pawn reaches last rank; bot auto-promotes to queen
- Draw detection: stalemate, threefold repetition, 50-move rule (halfmove clock), insufficient material (K vs K, K+B/N vs K, K+B vs K+B same-color bishops). Matches Lichess rules
- Click-to-move: all interactive board wrappers must use separate `dragFrom` state for drag tracking, keeping `selectedSquare` independent. Never clear `selectedSquare` in `onDragEnd` — that breaks click-click
