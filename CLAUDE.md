# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"How The Horsey Moves" — a free, open-source chess puzzle trainer for young students in classroom settings. Built with SvelteKit (Svelte 5 runes) + TypeScript (strict mode). No chat, no ads, no memberships, no server compute — everything is client-side. Deployed to Vercel.

It also hosts a couple of standalone, non-chess tools (e.g. `/breathwork`, a guided breathing trainer for performance-coaching students) that reuse the app's shell and audio layer but are not part of the chess curriculum or nav.

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
- One file per **concept**, each exporting a puzzle array: per-piece (`rook.ts`, `bishop.ts`, …) + `castling.ts`, `enpassant.ts`, `checkmate.ts`, the tactic concepts (`pins.ts`, `forks.ts`, `skewers.ts`, `removing-defender.ts`, `discovered.ts`), `mate-in-1.ts`, `mate-in-2.ts`, `pawn-endings.ts`, `lucena.ts`, `reti.ts`, `pawn-races.ts`. Order puzzles easy→hard within each file
- `index.ts` — Registry: `puzzleSets` (key → `PuzzleSet`), `getPuzzlesForPiece()`, `PIECES`, `CATEGORIES` (with `comingSoon` support for subcategories)

**Three-view organization model** (the repo is hand-maintained by a chess teacher — keep these separate):
- **Content files** (above) — grouped by concept, easy→hard. Where you edit puzzle data
- **`curriculum.ts` (`CURRICULUM`)** — the in-order *journey* (Level 1→8, concepts interleaved by difficulty). The single authority for "in order": read top-to-bottom = the website path. Content files can't also be journey-ordered (one file feeds stops in different chapters) and don't need to be
- **`CATEGORIES` + hub routes** (`/tactics`, `/checkmates`, `/endings`, `/vision`) — the browse-everything view, grouped by type; order not meaningful

The puzzle-set `key` string is the join across all three. **Multi-level concepts** (e.g. Pins 1, Pins 2): use explicit named consts per level in the concept file (`pinsLevel1`, `pinsLevel2`), each wired to its own `puzzleSets` key + a `curriculum.ts` stop placed in the right chapter. New ids get a level segment (`pins-2-01`); existing ids stay. No `level` field / no registry bucketing — grouping stays declared, not computed. Add a level only when its content exists

### Curriculum (`src/lib/curriculum.ts`)
- Defines `CURRICULUM: CurriculumChapter[]` — 8 levels with ~9 stops each, mapping the full learning path
- Each `CurriculumStop` has `id`, `name`, `icon`, `href`, and `progress` source (puzzle-set, localStorage key, or none)
- Helper functions: `getStopStars()`, `getAllStopStars()`, `getFirstIncompleteId()` for progress tracking
- Used by landing page `CurriculumPath` component to render the winding trail UI

### Model Games (`src/lib/games/`)
- `types.ts` — `ModelGame` interface
- `index.ts` — 14 classical games (Greco through Kasparov) with PGN strings. Most are unannotated — user annotates via Lichess studies, then pastes PGN with `{comments}` and `[%cal ...]` arrows

### Opening Trainer (`src/lib/openings/`)
- `parser.ts` — the engine: opening types (`OpeningMove`/`OpeningTree`/`OpeningLine`/`Opening`), PGN variation parser (`parseOpeningPgn`), `extractLines`, `findBranchPoint`, NAG display (`nagToSymbol`)
- `openings-data.ts` — the `OPENINGS` repertoire data + `getOpening()` lookup
- `index.ts` — re-export barrel (`export * from "./parser"; export * from "./openings-data";`). Consumers import from `$lib/openings`
- Parses `(variation)` syntax into a tree, extracts all root-to-leaf lines
- Student plays one color; opponent moves auto-play with animation
- Learn mode: arrows show each move. Practice mode: arrows only on mistakes

### State (`src/lib/state/`)
- `progress-store.ts` — Svelte writable store, persists to localStorage (`"horsey-progress"`). Sequential unlock: puzzle N requires N-1 completed
- `use-puzzle.svelte.ts` — State factory for gameplay: board state, move validation, drag-and-drop, star calculation, side-effects, multi-step solution validation
- `use-game.svelte.ts` — State factory for Play vs Computer: castling, promotion, bot moves, threefold repetition detection via `boardToKey()`
- `sound.ts` — Web Audio synthesis with mute toggle persisted to localStorage. Six sounds: `move`, `correct`, `wrong`, `stars`, `botCapture`, `botReact`. Used by puzzles, game, endgame trainers, and bot character reactions. Exports `getCtx()` (the shared `AudioContext`) so other synth modules — e.g. the breathwork drone — reuse one context

### Components (`src/lib/components/`)
Folders group components by feature (`board/`, `puzzle/`, `endgame/`, `blindfold/`, `game/`, `opening/`, `lessons/`, …). The exception is `ui/` — shared, generic presentational primitives used across many features. Put a component in its feature folder if it's specific to that feature; promote it to `ui/` only when it's a generic atom reused across several feature folders.
- `ui/StarRating.svelte` — presentational atom: renders 3 ★ glyphs, `stars` (0–3) filled, `size` `'sm'|'md'|'lg'`. No behavior. Used in ~37 places app-wide (puzzles, blindfold/vision, endgame, curriculum path, hub pages)
- `board/Board.svelte` — SVG-based 800x800 board with drag-and-drop, click-to-move, valid move indicators, target stars, arrows, slide animations, danger-square overlays. `readOnly` prop skips animations (used by game viewer). `playableColors` prop allows playing both sides (used by game viewer test mode). `dangerSquares` prop highlights squares with red semi-transparent overlay
- `board/CoordinateTrainer.svelte` — Timed 30s square-naming mini-game. Stars: 3 for 10+, 2 for 5+, 1 for 3+. Best score/stars persisted to localStorage (`coord-best`, `coord-best-stars`). Standalone from puzzle progress system
- `board/SetupTrainer.svelte` — 7 stages: place rooks, knights, bishops, king, queen, pawns, then full setup. Each stage individually addressable via `/setup/[stage]`. Exports `SETUP_STAGES` via `<script module>`. Supports click-click and drag-from-tray. Stars based on mistakes: 0=3, 1-2=2, 3+=1. Per-stage localStorage: `setup-{slug}-best-stars`
- `puzzle/PuzzleShell.svelte` — Main puzzle container. Hides target stars when `puzzle.arrows` is set
- `game/GameViewer.svelte` — PGN game viewer with path-based navigation (`currentPath: GameNode[]`), auto-play, keyboard nav (`<svelte:window>`), comments, arrows. Variations display inline in the move grid. "Pause at variations" toggle stops auto-play at branch points. Test mode uses `extractMainLine()` for flat main-line-only memorization
- `game/PgnExplorer.svelte` — Lightweight PGN explorer for embedding annotated move trees. Takes `pgn` + optional `fen` props, renders board + clickable move grid with variations, comments, and keyboard nav. Used by PawnEndingsLesson to show post-quiz analysis. Reuses `parseGamePgn()` tree + same move-grid visual pattern as GameViewer but without test/autoplay/explore modes
- `game/GameShell.svelte` — Play vs Computer wrapper, accepts `botLevel` prop. Integrates bot character panel with reaction system (captures, checks, checkmate, thinking animations + speech bubbles)
- `opening/OpeningTrainer.svelte` — Opening repertoire trainer with learn/practice phases
- `endgame/EndgameShell.svelte` — KPK bitbase trainer (`src/lib/logic/kpk-bitbase.ts`: 24KB retrograde analysis). Bot plays perfect defense via bitbase; validates student moves must maintain winning evaluation. Win condition: pawn reaches rank 8. Stars: 0 mistakes=3, 1=2, 2+=1
- `endgame/MateTrainer.svelte` — Mate conversion trainer (KQK, KRRK, KRK, KBBK, KBNK)
- `endgame/DrawTrainer.svelte` — "Hold the draw" trainer. Student plays Black (defender), bot plays White (attacker). Supports `botStrategy` prop: `'heuristic'` (default, simple evaluation) or `'bitbase-kpk'` (perfect play via KPK bitbase). Win = draw achieved (stalemate, threefold repetition, 50-move rule). Lose = checkmate or clean promotion. Uses `boardToKey()` for threefold detection. Optional `onNext` callback for lesson flow integration
- `lessons/PawnEndingsLesson.svelte` + `pawn-endings-data.ts` — Multi-step pawn endings lesson with 3 step types: `DiagramStep` (static board + key squares/arrows), `QuizStep` (animate intro, ask "what will be the result?", animate proof), `TrainerStep` (inline EndgameShell or DrawTrainer). QuizStep supports optional `annotatedPgn` field — when present, an "Explore" button after the result toggles a PgnExplorer with variations and comments. Sections: Rule of the Square, Key Squares, Opposition, Outside Passed Pawn, Breakthrough, Trebuchet, Guard the Entry, Play It Out (KPK Convert + Defend)
- `lessons/HowToWinLesson.svelte` + `how-to-win-data.ts` — 15-step guided lesson: check → escaping check (move/capture/block) → giving check → checkmate demo → stalemate demo → 5 mate-in-1 practice → 2 don't-stalemate practice. Validation modes: "any", "check", "checkmate", "no-stalemate". Stars based on mistakes. localStorage: `how-to-win-best-stars`
- `nav/NavBar.svelte` — Sticky top nav with sections: Learn, Tactics, Checkmates, Endings, Play, Vision. Responsive title (text on wide screens, favicon on narrow via CSS media query at 640px). `isActive()` logic: each hub claims its routes, Learn catches the rest
- `characters/BotAvatar.svelte` — Animated avatar with CSS keyframes (bob, rock, bounce, shake, jump, tilt, celebrate, droop). Props: `avatar`, `size`, `animation`
- `characters/SpeechBubble.svelte` — Accent-colored speech bubble with fade-in animation on text change
- `characters/BotPanel.svelte` — Combines BotAvatar + name + SpeechBubble. Used by GameShell sidebar
- `characters/bots.ts` — `BotCharacter` interface and `BOT_CHARACTERS` registry. Each character has `reactions` pools (greeting, thinking, capture, captured, check, checkmate, checkmated, draw, move). `getCharacter(level)` lookup. Currently: random → "The Sloth" (Kenney CC0 animal sprite)
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
- `/lichess-eval-diffs` — Interactive report: do engine-preferred moves score better in human games? Data from 56.7M Lichess games (March 2026) enriched with chessdb.cn evals. Pre-aggregated data in `src/lib/eval-diffs-data.ts`, generated by the [lidbcn](../lidbcn) pipeline
- `/breathwork` — Standalone breathing trainer (NOT in the nav bar — direct-link only). See the Breathwork section below

### Breathwork Trainer (`src/lib/breathwork/`, `src/lib/components/breathwork/`, `/breathwork`)
- A self-contained, soothing guided-breathing tool aimed at performance-coaching students. Off the chess curriculum, deliberately not linked from the NavBar; reuses the app theme + Web Audio layer. Spec/research lives in `breathwork-tool-brief.md` at repo root
- Two protocols, switched via tabs on `src/routes/breathwork/+page.svelte`:
  - **Resonance Breathing** (`ResonanceTrainer.svelte`) — slow-paced, 40/60 inhale:exhale split. Rate set by a single bpm slider (4.5–7.0, default 5.5). No height/sex inputs; instead a read-only science table (`RATE_TABLE`, from Hasuo et al. 2024) is shown as a guide. Session presets 2/10/13/17 min
  - **Cyclic Physiological Sigh** (`SighTrainer.svelte`) — double-inhale (2 s + 1 s top-off) then long exhale (5–8 s). Doses: quick reset (3 cycles) or 5-min practice
- `engine.ts` — `BreathEngine`: framework-agnostic, drift-corrected phase-sequence driver (`setTimeout` chained against `performance.now()`). Fires `onPhase`/`onCycle`/`onTick`/`onComplete`. Phases: resonance `[inhale, exhale]`; sigh `[inhale, topoff, exhale]`
- `audio.ts` — `BreathDrone`: sustained two-tone drone (NOT the `sound.ts` blips). Warm inhale tone (~220 Hz) + lower exhale tone (~165 Hz), each a fundamental + a fifth partial through a low-pass filter. Transitions use a **ducked roll-on** (leaving tone dims, short gap, arriving tone rolls in) rather than a hard crossfade. Octave shimmer accent on the sigh top-off. Reuses the shared `AudioContext` via `getCtx()` (exported from `sound.ts`), respects the global `soundMuted` store, starts only on a user gesture
- `BreathPacer.svelte` — the visual: expanding/contracting orb + blurred ambient glow, warm-on-inhale / cool-on-exhale, CSS-transition tempo driven by `phaseSeconds`, `prefers-reduced-motion` fallback
- `prefs.ts` — simple localStorage prefs (`breathwork-last-mode`, `breathwork-rate`, `breathwork-session-mins`, `breathwork-sigh-exhale`). No personal data stored
- Each trainer includes a "why this works" panel; the route has a safety/disclaimer `<details>`

### Lichess-Sourced Puzzles
- Many practice puzzles were originally seeded from the Lichess puzzle database (CC0 public domain), then **hand-curated**. They live in the concept files alongside hand-authored puzzles (`pins.ts`, `forks.ts`, `skewers.ts`, `removing-defender.ts`, `discovered.ts`, `mate-in-1.ts`, `mate-in-2.ts`, `pawn-endings.ts`). Their ids keep the `lichess-*` prefix (those ids are localStorage progress keys — don't rename them)
- Pins file order: hand-authored teaching pins first (with hints), then the curated lichess pins
- Integrated into the standard puzzle system via `PuzzleShell` — no separate trainer component
- **Finding more puzzles** (`scripts/filter-lichess.py`): generates puzzle *candidates* into a sandbox (`scripts/puzzle-candidates/`, gitignored) — it never writes to the live curated files. Filters by: rating < 1200 (1200-1800 for pawn endings), white-to-move only, low piece count, same piece type across all player moves (except `pawnEndgame` which allows mixed K+P; `pawns_only` flag restricts to king+pawn positions). Workflow: download `lichess_db_puzzle.csv.zst` from database.lichess.org, decompress to `data/lichess_db_puzzle.csv` (gitignored), run `python3 scripts/filter-lichess.py data/lichess_db_puzzle.csv` (python-chess in a venv), then copy the puzzles worth keeping into the matching concept file with a unique id

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
- After making UI layout changes, verify with a Chromebook-sized viewport (1366×768). CSS changes that look fine on a large monitor can break on smaller screens

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

## Bot Characters (`src/lib/characters/`)

- Each bot level can have a `BotCharacter` with name, avatar (Kenney CC0 sprite), accent color, description, and reaction text pools
- Characters are optional — bots without a character entry fall back to a plain text header in GameShell
- Reaction system in GameShell uses `$effect` blocks watching `game.moveHistory`, `game.waitingForBot`, and `game.result` to trigger animations + speech bubbles
- CSS keyframe animations on the avatar: idle bob, thinking rock, capture bounce, captured shake, check jump, move tilt, win celebrate, lose droop
- Adding a new character: add entry to `BOT_CHARACTERS` in `bots.ts`, place sprite PNG in `static/characters/`
- Art assets from [Kenney's Animal Pack Remastered](https://kenney.nl/assets/animal-pack-remastered) (CC0, by Kenney Vleugels)
