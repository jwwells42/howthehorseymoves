# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"How The Horsey Moves" — a free, open-source chess puzzle trainer for young students in classroom settings. Built with SvelteKit (Svelte 5 runes) + TypeScript (strict mode). No chat, no ads, no memberships, no server compute — everything is client-side. Deployed to Vercel.

It also hosts a couple of standalone tools that reuse the app's shell but sit off the chess curriculum and nav: `/breathwork` (a guided breathing trainer) and `/probabilitizer` (an opening-line-odds explorer backed by the Lichess opening explorer API).

## Commands

```bash
npm run dev          # Dev server at localhost:5173
npm run build        # Production build
npm run check        # TypeScript + Svelte diagnostics (svelte-kit sync + svelte-check)
npm test             # Vitest: design-system rules (src/design.test.ts) + every puzzle loads (src/puzzles.test.ts) + levels fit (src/curriculum.test.ts)
```

There are three test files. `src/curriculum.test.ts` checks every level fits in nine cards with its bot last, stop ids are unique, and every `puzzle-set` stop names a real set. `src/design.test.ts` holds the design-system rules (see Design system below). `src/puzzles.test.ts` checks puzzle data can run: every tactic puzzle's moves (and string `demo`) go through `parsePuzzleMoves` without error, and every FEN with a side-to-move anywhere in `src/` (`.ts`, `.svelte`, `.pgn`) is a legal start — the side not to move isn't in check, and no pawn sits on rank 1 or 8. A puzzle whose moves can't be played never opens (typing its URL shows an error page; clicking it does nothing), so this is the guard. It does not check that a puzzle is good chess or that a mate is a mate.

## Design system

Every colour, the typeface and the type sizes live in **`src/app.css`** as custom properties, with element defaults (body, headings, focus ring, `.sr-only`, shared keyframes). Shared patterns are components (`ui/`, `board/`). Everything else is scoped CSS that reads tokens through `var()`. No component writes a colour of its own.

**Where each choice comes from:**
- **Right/wrong = blue/coral, never green/red.** Blue and orange-red stay apart for every common kind of colour blindness (the idea behind Okabe & Ito's *Color Universal Design*, 2008); red and green don't — the old green and red were 9 ΔE apart under deuteranopia. The current pair is Radix blue 10 `#3b9eff` and tomato 11 `#ff977d`. Always pair the colour with a shape (✓ / ✗) for non-readers
- **Colours come from [Radix Colors](https://github.com/radix-ui/colors)** (MIT), a UI colour system whose scales are built to sit together — that's where the harmony comes from. Every token is an exact Radix step, named in an app.css comment ("lime 4" = step 4 of the dark Lime scale). Page/cards/raised/borders are Lime 4–7 (`#29371d` → `#496231`), a warm meadow green (hue 91°); text and buttons are Radix's warm cream/tan (gold 12/11). The meaning colours (right, wrong, look here, fourth mark, board) were picked by a search over Radix steps for the softest set that still passes the colour-blind and contrast rules. History, 2026-10-01: a rule-built USWDS emerald read as generic ("more AI"); the old olive `#2d4a22` came back but wasn't harmonious; Everforest was rejected as a cool slate (hue 206°). **The user wants a warm meadow on a dark green — check hue, not palette names**
- **Contrast is WCAG 2 AA**: 4.5:1 for text, 3:1 for large/bold text and shapes
- **Colour-blind checks** simulate deuteranopia and protanopia with Machado, Oliveira & Fernandes (IEEE TVCG 2009) and require CIE76 ΔE ≥ 25 between colours that carry meaning
- **Typeface: TeX Gyre Adventor** (GUST e-foundry, GUST Font License), a free twin of Avant Garde Gothic, which the site's original Century Gothic was drawn to match. Research doesn't favour one clear sans-serif over another — the "dyslexia fonts" showed no benefit (Wery & Diliberto 2017; Kuster et al. 2018) — so it was picked on look, from a side-by-side test of ten fonts. Regular and bold only, self-hosted as CTAN's unmodified `.otf` files in `static/fonts/` (about 170 KB each; the licence asks that modified versions be renamed), regular preloaded in `app.html`. Fallbacks: Century Gothic, Arial
- **Body text is 18px, nothing below 14px.** Children of 5–7 read faster as text gets larger, and no age reads worse for it (Hughes & Wilkins, 2000)
- **Emphasis is bold, never italic.** Readers with dyslexia read italic more slowly (Rello & Baeza-Yates, 2013), and the font has no true italic. `em`/`i` are restyled to bold globally

**Tokens** (see app.css for values):
- Type: `--font`; weights `--weight-regular`, `--weight-medium`, `--weight-strong` (every bold thing reads `--weight-strong`; the font has 400 and 700 only); sizes `--size-small` (14px, labels/counts/coordinates), `--size-secondary` (16px), `--size-body` (18px), `--size-large` (22px, card/trainer titles), `--size-title` (32px, one per page)
- Page: `--page` (background), `--surface` (cards, panels — opaque), `--surface-raised` (buttons, hovered cards), `--line` (borders)
- Text: `--ink` (on anything), `--ink-muted` (on `--page`/`--surface` only, not `--surface-raised`)
- Main action (Start, Next, Continue): `--action`, `--action-hover`, `--on-action`. Cream, so it never looks like an answer
- Answers: `--correct`, `--correct-text`, `--correct-tint`, `--wrong`, `--wrong-text`, `--wrong-tint`, `--on-answer`. The `-text` versions are for words on `--page`/`--surface`. White on `--wrong` passes only for large/bold text
- "Look here" (selected square, warning, next stop, focus ring): `--highlight`, `--highlight-glow`, `--highlight-tint`. A fourth mark colour: `--mark-other`
- Stars: `--star`, `--star-edge`
- Board: `--board-light`, `--board-dark` (Radix orange-3 cream and lime 7, 6:1 apart, so they differ without colour; a lighter dark square gets too close to `--wrong` for protanopia. Gold 5 read as a cool grey; a warmer cream than orange 3, including the old `#efe2c0`, falls under ΔE 25 from `--wrong` for deuteranopia), `--board-move-dot`, `--board-target`
- Plain-colour pieces / results bar: `--piece-white`, `--piece-black`, `--result-draw`
- Route-puzzle walls: `--wall-brick`, `--wall-mortar`, `--wall-edge` (brown, so a wall isn't read as a `--wrong` square)
- Breathwork orb: `--breath-rest`, `--breath-in`, `--breath-top`, `--breath-out`, `--breath-ink`
- Overlays: `--scrim`, `--shadow`
- One per bot (name + difficulty pips): `--bot-sloth`, `--bot-chick`, `--bot-frog`, `--bot-rabbit`, `--bot-panda`, `--bot-monkey`, `--bot-bear`, `--bot-owl`

**Board marks** (`src/lib/board-marks.ts`): arrows and square highlights take a colour from `MARK` — `good` (`--correct`), `danger` (`--wrong`), `note` (`--highlight`), `other` (`--mark-other`). Lichess `[%cal]`/`[%csl]` letters map through `LICHESS_MARKS` (G→good, R→danger, Y→note, B→other), so a green arrow in a study shows in the app's "right move" blue. `highlight(squares, color, look?)` builds `SquareHighlight[]`; a look is `tint` (default), `solid` (better on small boards) or `ring`. Apply a mark with `style:fill={mark}` — an SVG presentation attribute like `fill={mark}` doesn't read `var()`.

**`npm test` enforces it** (`src/design.test.ts`, reading app.css directly):
- Contrast rules for every text/background pair that's actually used, including each `--bot-*` on `--page` and `--surface`
- `--correct`, `--wrong`, `--highlight`, `--mark-other` and both board squares stay ≥ 25 ΔE apart under normal, deuteranopic, protanopic and tritanopic vision (and `--correct-text` vs `--wrong-text`)
- No hex / `rgb()` / `hsl()` colour anywhere in `src/` outside app.css (HTML entities like `&#9733;` are fine)
- No `font-family` other than `inherit` or `var(--font)`; no `font-size` below 14px; no `font-style: italic`/`oblique`
- No `font-weight` other than `var(--weight-*)` or `inherit`, so how bold the site looks stays one setting
- Every `var(--x)` that is read is defined somewhere — a misspelt token fails silently in the browser (the rule is dropped)

Adding a colour = add a token to app.css (with its Radix scale and step in a comment), add it to the relevant rule list in design.test.ts if it carries meaning, then use it via `var()`.

**Tuning the look by hand** — edit `src/app.css` (Radix's other steps are the natural neighbours to try), then run `npm test`; it says straight away if a change drops below the contrast floor or makes two meaning colours hard to tell apart for colour-blind students.
- **These set the mood — change freely:** `--page`, `--surface`, `--surface-raised`, `--line`, `--ink`, `--ink-muted`, `--action`, `--action-hover`, `--on-action`, `--board-light`, `--board-dark`, `--font` (plus its `@font-face`), `--weight-strong`, and the `--bot-*` colours
- **These carry meaning — leave them:** `--correct`, `--wrong` (and their `-text`/`-tint`), `--highlight`, `--mark-other`, `--star`. Students who can't read rely on them, and they were picked to stay apart for colour-blind eyes
- **Comparing options:** the overhaul's look was chosen from headless-Chrome screenshots with candidate colours/fonts injected at runtime (nothing in the repo changes until one is picked). Show crops at full size and verify the font with DevTools' `CSS.getPlatformFontsForNode` — scaled-down screenshots make every font look the same

## Architecture

**Three-layer design**: chess logic → state management → Svelte UI.

### Chess Logic (`src/lib/logic/`)
- `types.ts` — Core types: `PieceKind`, `PieceColor`, `SquareId` (union of all 64 squares), `BoardState` (Map-based, immutable). FEN parser via `parseFen()`. Position hashing via `boardToKey()` (used for threefold repetition)
- `moves.ts` — Pure functions for move generation per piece type. Sliding pieces (R/B/Q) use direction arrays; step pieces (K/N) use offset arrays; pawns have special forward/capture/en-passant logic
- `attacks.ts` — `isSquareAttacked()`, `isInCheck()`, `isCheckmate()`, `isStalemate()`, `getLegalMoves()`, `getAllLegalMoves()`
- `pgn.ts` — PGN parsers. Flat `parsePgn()` for simple move lists; tree-based `parseGamePgn()` → `GameTree`/`GameNode` with full variation support (`(...)` syntax), comments, NAGs, arrows. A multi-game PGN (e.g. a Lichess study's chapters) merges into one tree — a header after movetext starts the next game, which follows the moves already in the tree and branches off as a variation; a single game parses exactly as before. `extractMainLine(tree)` flattens to `ParsedGame` for backward compat / test mode. Exports `parseSan()` and `applyMove()` (also used by openings parser). Supports comments (`{text}`), NAGs (`!`, `!!`), arrows (`[%cal Ge2e4]`)
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
- Defines `CURRICULUM: CurriculumChapter[]` — 8 levels of at most 9 stops (8 + the bot), mapping the full learning path
- Each `CurriculumStop` has `id`, `name`, `icon`, `href`, and `progress` source (puzzle-set, localStorage key, or none)
- Helper functions: `getStopStars()`, `getAllStopStars()`, `getFirstIncompleteId()` for progress tracking
- Used by landing page `CurriculumPath` component to render the winding trail UI

### Model Games (`src/lib/games/`)
- `types.ts` — `ModelGame` interface
- `index.ts` — 14 classical games (Greco through Kasparov) with PGN strings. Most are unannotated — user annotates via Lichess studies, then pastes PGN with `{comments}` and `[%cal ...]` arrows

### Opening Trainer (`src/lib/openings/`)
- `parser.ts` — the engine: opening types (`OpeningMove`/`OpeningTree`/`OpeningLine`/`Opening`), PGN variation parser (`parseOpeningPgn`), `extractLines`, `truncateLines` (cut lines after N of a color's moves, deduped), `findBranchPoint`, NAG display (`nagToSymbol`)
- `openings-data.ts` — the `OPENINGS` repertoire data + `getOpening()` lookup
- `pgn/` — whole Lichess study exports kept verbatim, imported with `?raw`: `e4-mainline-starter.pgn` and `d4-mainline-starter.pgn` (White 1.e4 / 1.d4 repertoires). `studyRepertoire(id, title, color, pgn)` in openings-data.ts turns one study into **one card** (the user wants each repertoire as a single card, not one per chapter), under "Full repertoires" on `/openings`: `splitPgnChapters()` (parser.ts) splits it by chapter (name from `[ChapterName]`, move-less intro chapter dropped), the chapters are joined back into one tree at `/openings/{id}` (`/openings/e4`, `/openings/d4`), which opens in "3 moves at a time" (`defaultOrder: "breadth"`). The card description lists the chapter names and is generated from the moves (`describe()`: shared trunk + line count, or a ⚠ with the parse error), so updating = re-export the study and overwrite the file; adding a study = drop the file in `pgn/` + one `studyRepertoire(...)` line
- `Opening.group` — openings with a group get their own section on `/openings` (above Play as White/Black) instead of being listed by color
- `index.ts` — re-export barrel (`export * from "./parser"; export * from "./openings-data";`). Consumers import from `$lib/openings`
- Parses `(variation)` syntax into a tree, extracts all root-to-leaf lines
- Student plays one color; opponent moves auto-play with animation
- Learn mode: arrows show each move. Practice mode: arrows only on mistakes
- **Setup screen layout**: the next thing to do comes first — the step track (one dot per 3 of your moves, with the move numbers under it; filled = learned, ringed = up next) and the Start buttons, which say what they'll drill ("Learn moves 7–9", "Practice moves 1–6"; Practice becomes the main button once everything is learned). Settings sit underneath: "How to learn" (a stacked `Choice` built from the `ORDERS` table — a new way of learning = a row there plus its rules in `startDrilling`/`drillLines`/`isNew`), the line picker folded into a `<details>` (each line shown from where it leaves the line above, via `findBranchPoint`), and auto-advance (remembered in `opening-auto-next` for every opening)
- **Drill sidebar layout**, top to bottom: where am I (opening name, ‹ Line N of M ›, the moves being drilled, a `ProgressBar` of lines done — in BoardLayout's `headerArea`, so it sits above the board on a phone), what to do now (one status line, which becomes "✓ Line done [Next line]"), the comment, the move list, then the Learn/Practice switch and ← Setup
- **Order** on the setup screen: "One line at a time" (depth-first, the original behavior) or "3 moves at a time" (breadth-first, like ChessTempo). Breadth order drills `truncateLines(activeLines, color, stageDepth)`: stage 1 = every line up to your 3rd move, then "Keep going" adds 3 more. Arrows in Learn are only for *new* moves (`isNew()`: move number > `learnedDepth`), so earlier stages are recalled without help and hidden in the move list until played; a mistake still brings the hint arrow back. `stageDepth` is set when a drill starts (not derived from phase), so flipping Learn/Practice mid-stage keeps the same lines. Progress is saved per built-in opening as `opening-{id}-learned-depth` (your moves learned; not saved for custom PGNs) and a saved value reopens the setup in breadth order. An opening with `defaultOrder: "breadth"` always starts there (the whole-study repertoires do). `opening-{id}-complete` is only written by a practice run over full-length lines

### State (`src/lib/state/`)
- `progress-store.ts` — Svelte writable store, persists to localStorage (`"horsey-progress"`). Sequential unlock: puzzle N requires N-1 completed
- `use-puzzle.svelte.ts` — State factory for gameplay: board state, move validation, drag-and-drop, star calculation, side-effects, multi-step solution validation
- `use-game.svelte.ts` — State factory for Play vs Computer: castling, promotion, bot moves, threefold repetition detection via `boardToKey()`
- `sound.ts` — Web Audio synthesis with mute toggle persisted to localStorage. Six sounds: `move`, `correct`, `wrong`, `stars`, `botCapture`, `botReact`. Used by puzzles, game, endgame trainers, and bot character reactions. Exports `getCtx()` (the shared `AudioContext`) so other synth modules — e.g. the breathwork drone — reuse one context

### Components (`src/lib/components/`)
Folders group components by feature (`board/`, `puzzle/`, `endgame/`, `blindfold/`, `game/`, `opening/`, `lessons/`, …). The exception is `ui/` — shared, generic presentational primitives used across many features. Put a component in its feature folder if it's specific to that feature; promote it to `ui/` only when it's a generic atom reused across several feature folders.
- `ui/StarRating.svelte` — presentational atom: renders 3 ★ glyphs, `stars` (0–3) filled, `size` `'sm'|'md'|'lg'`. No behavior. Used in ~37 places app-wide (puzzles, blindfold/vision, endgame, curriculum path, hub pages)
- `ui/` shared primitives (all read tokens from app.css):
  - `Button` — `variant` `'primary'` (the one next thing on a screen: Start, Next, Continue — cream `--action`) or `'secondary'`; `size` `'normal'|'large'`; renders an `<a>` when given `href`
  - `Choice` — pick one of a few options (difficulty, mode, order) as a row of buttons; radio buttons underneath, so arrow keys and screen readers work. `width: fit-content`, so the parent decides alignment. `stacked` makes it a full-width column of quieter radio cards, each option with an optional `description` line — use it for more than three options or ones that need explaining. `hideLabel` keeps the label for screen readers only
  - `Page` — page wrapper: `title`, `subtitle`, `back` (`{ href, label }` → BackLink), `width` `'narrow'|'normal'|'wide'`
  - `CardList` (optional `title` + a column of cards) and `LinkCard` (`href`, `icon`, `title`, `description`, `aside` snippet; leave out `href` and pass `reason` for something not openable yet)
  - `BackLink` — the "← Back to …" link
  - `ProgressBar` (`value`/`max`/`label`, `hurry` turns it `--highlight`) and `Countdown` (a ProgressBar of seconds left for timed trainers; hurries in the last 5 s, score in its `children`)
  - `BestScore` — "Best: N" + stars; shows nothing until there is a best
- `board/Board.svelte` — **the one board for every screen** (puzzles, games, trainers, review thumbnails, editor). SVG, drag-and-drop + click-to-move. Coordinates scale up so they're never under 14px on screen; turn them off with `coordinates={false}` on small boards. Props, grouped:
  - Display: `board`, `label` (screen readers), `readOnly` (a picture: no input, no animation), `flipped`, `coordinates`
  - Input: `selectedSquare`, `validMoves`, `dragValidMoves`, `draggablePiece`, `playableColors` (default white; `['w','b']` plays both sides; `[]` makes every tap a click, for placing pieces), `onSquareClick`, `onDrop`, `onDragStart`, `onDragEnd`
  - Feedback: `wrongMoveSquare`, `pawnSlide`, `opponentSlide`
  - Drawn on it: `targets` (stars), `reachedTargets` (ticks), `highlights` (`SquareHighlight[]` from `$lib/board-marks`), `arrows`, `obstacles` (drawn as brick walls), `route` (S, 1, 2… joined by a line), `children` (SVG on top, in board units)
- `board/BoardLayout.svelte` — board + sidebar layout (`boardArea`, `sidebarArea`, optional `headerArea` that sits above the board on mobile). Its board area is `position: relative`, so a BoardOverlay covers the board
- `board/BoardOverlay.svelte` (something over the board: a result, a choice, "tap to start"; `dim` adds the `--scrim`), `board/ResultSymbol.svelte` (🏆 win / ½ draw / 🏳️ resign — readable without reading), `board/PromotionPicker.svelte` (Q/R/B/N over the board), `board/MoveNav.svelte` (⏮ ◀ ▶ ⏭ + optional play/pause; symbols, not words), `board/Wall.svelte` (one brick-wall square)
- `EMPTY_BOARD` (an empty `BoardState`) is in `$lib/logic/types`
- `board/CoordinateTrainer.svelte` — Timed 30s square-naming mini-game. Stars: 3 for 10+, 2 for 5+, 1 for 3+. Best score/stars persisted to localStorage (`coord-best`, `coord-best-stars`). Standalone from puzzle progress system
- `board/SetupTrainer.svelte` — 7 stages: place rooks, knights, bishops, king, queen, pawns, then full setup. Each stage individually addressable via `/setup/[stage]`. Exports `SETUP_STAGES` via `<script module>`. Supports click-click and drag-from-tray. Stars based on mistakes: 0=3, 1-2=2, 3+=1. Per-stage localStorage: `setup-{slug}-best-stars`
- `puzzle/PuzzleShell.svelte` — Main puzzle container. Hides target stars when `puzzle.arrows` is set
- `puzzle/PuzzleSetCard.svelte` — a LinkCard for one puzzle set (`set: SubcategoryInfo`): solved/total, plus stars once every puzzle is solved. Used by the hub pages and `/learn/[piece]`
- `game/GameViewer.svelte` — PGN game viewer with path-based navigation (`currentPath: GameNode[]`), auto-play, keyboard nav (`<svelte:window>`), comments, arrows. Variations display inline in the move grid. "Pause at variations" toggle stops auto-play at branch points. Test mode uses `extractMainLine()` for flat main-line-only memorization
- `game/PgnExplorer.svelte` — Lightweight PGN explorer for embedding annotated move trees. Takes `pgn` + optional `fen` props, renders board + clickable move grid with variations, comments, and keyboard nav. Used by PawnEndingsLesson to show post-quiz analysis. Reuses `parseGamePgn()` tree + same move-grid visual pattern as GameViewer but without test/autoplay/explore modes
- `game/GameShell.svelte` — Play vs Computer wrapper, accepts `botLevel` prop. Integrates bot character panel with reaction system (captures, checks, checkmate, thinking animations + speech bubbles). Also holds the Resign button (see Bot System)
- `opening/OpeningTrainer.svelte` — Opening repertoire trainer with learn/practice phases
- `endgame/EndgameShell.svelte` — KPK bitbase trainer (`src/lib/logic/kpk-bitbase.ts`: 24KB retrograde analysis). Bot plays perfect defense via bitbase; validates student moves must maintain winning evaluation. Win condition: pawn reaches rank 8. Stars: 0 mistakes=3, 1=2, 2+=1
- `endgame/MateTrainer.svelte` — Mate conversion trainer (KQK, KRRK, KRK, KBBK, KBNK)
- `endgame/DrawTrainer.svelte` — "Hold the draw" trainer. Student plays Black (defender), bot plays White (attacker). Supports `botStrategy` prop: `'heuristic'` (default, simple evaluation) or `'bitbase-kpk'` (perfect play via KPK bitbase). Win = draw achieved (stalemate, threefold repetition, 50-move rule). Lose = checkmate or clean promotion. Uses `boardToKey()` for threefold detection. Optional `onNext` callback for lesson flow integration
- `lessons/PawnEndingsLesson.svelte` + `pawn-endings-data.ts` — Multi-step pawn endings lesson with 3 step types: `DiagramStep` (static board + key squares/arrows), `QuizStep` (animate intro, ask "what will be the result?", animate proof), `TrainerStep` (inline EndgameShell or DrawTrainer). QuizStep supports optional `annotatedPgn` field — when present, an "Explore" button after the result toggles a PgnExplorer with variations and comments. Sections: Rule of the Square, Key Squares, Opposition, Outside Passed Pawn, Breakthrough, Trebuchet, Guard the Entry, Play It Out (KPK Convert + Defend)
- `lessons/HowToWinLesson.svelte` + `how-to-win-data.ts` — 15-step guided lesson: check → escaping check (move/capture/block) → giving check → checkmate demo → stalemate demo → 5 mate-in-1 practice → 2 don't-stalemate practice. Validation modes: "any", "check", "checkmate", "no-stalemate". Stars based on mistakes. localStorage: `how-to-win-best-stars`
- `nav/NavBar.svelte` — Sticky top nav with sections: Learn, Tactics, Checkmates, Endings, Play, Vision. Responsive title (text on wide screens, favicon on narrow via CSS media query at 640px). `isActive()` logic: each hub claims its routes, Learn catches the rest
- `characters/BotAvatar.svelte` — Animated avatar with CSS keyframes (bob, rock, bounce, shake, jump, tilt, celebrate, droop). Props: `avatar`, `size`, `animation`
- `characters/SpeechBubble.svelte` — Speech bubble in the bot's colour with fade-in animation on text change
- `characters/BotPanel.svelte` — Combines BotAvatar + name + SpeechBubble. Used by GameShell sidebar
- `characters/bots.ts` — `BotCharacter` interface and `BOT_CHARACTERS` registry. Each character has `reactions` pools (greeting, thinking, capture, captured, check, checkmate, checkmated, draw, move). `getCharacter(level)` lookup. Currently: random → "The Sloth" (Kenney CC0 animal sprite)
- `blindfold/` — 19 blindfold/visualization components (23 trainers total — BlindfoldMate handles 5 endgame types), all standalone localStorage keys. Includes: ColorOfSquare, SameDiagonal, SameRankFile, MoveCounting, KnightRoutes, BishopRoutes, PieceReachability, NeighborSquares, KnightSquares, WhatChanged, WhereDidItLand, FlashPosition, PieceCount, RookMaze, BlindTactics, BlindfoldPuzzle, KnightGauntlet, GuardingGame, BlindfoldMate
  - Shared pieces: `AnswerInput` (text box + Go for typed squares/moves/numbers; grabs focus whenever enabled), `RouteTrail` (`e4 → f6 → ?`), `ReviewGrid` + `ReviewCard` (the mini boards after a timed trainer ends: frame and ✓/✗ in `--correct`/`--wrong`, highlights forced `solid` so they read at thumbnail size)

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
- `/openings`, `/openings/[id]` — Opening repertoire trainer (`/openings/e4` and `/openings/d4` = the whole 1.e4 / 1.d4 Mainline Starter repertoires)
- `/play` — Play vs computer
- `/editor` — Puzzle creator (place pieces, generate FEN strings)
- `/about` — Privacy, COPPA, credits, license, administrator info
- `/lichess-eval-diffs` — Interactive report: do engine-preferred moves score better in human games? Data from 56.7M Lichess games (March 2026) enriched with chessdb.cn evals. Pre-aggregated data in `src/lib/eval-diffs-data.ts`, generated by the [lidbcn](../lidbcn) pipeline
- `/breathwork` — Standalone breathing trainer (NOT in the nav bar — direct-link only). See the Breathwork section below
- `/probabilitizer` — Standalone "line odds" tool (NOT in the nav bar — direct-link only). See The Probabilitizer section below

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

### The Probabilitizer (`src/lib/probabilitizer/`, `/probabilitizer`)
- A self-contained "line odds" tool. Off the chess curriculum, deliberately not linked from the NavBar (stays off-nav simply by not being in `NavBar.svelte`'s `SECTIONS`). Recreation of [Opening-Explorer-Plus](https://github.com/EikaMikiku/Opening-Explorer-Plus) by EikaMikiku — the page credits the original at the bottom
- **What it does**: reports the cumulative probability that a whole opening line arises *from the starting position*, split by mover (e.g. "Masters get here X% of the time as White"). Differs from a normal explorer's per-position frequency. Math ported from OEP: at each ply a move's conditional probability = its share of games there; multiply along the line, but split White's vs Black's moves (you control your own moves, only the opponent's replies are uncertain). A per-move "Skip" toggle treats a move as forced (probability 1, dropped from the product). The "Your line" table shows both each move's conditional % ("This move") and the running cumulative % ("Line so far")
- **The one external network call in the app**: `lichess.ts` (`fetchExplorer`) hits the Lichess opening explorer API (`explorer.lichess.ovh`). Positions are encoded as a UCI move list via the `play=` param (from the standard start), so no FEN is needed for queries. Everywhere else the app has zero `fetch()` calls
- **Requires "Login with Lichess"**: since Feb 2026 (post-DDoS) the explorer rejects anonymous requests — every request needs an OAuth Bearer token. `auth.ts` runs the Authorization Code + PKCE flow via `@bity/oauth2-auth-code-pkce` (Lichess's recommended lib) — fully client-side, no server, no client secret. Requests **zero scopes** (the explorer only needs you authenticated). The token is stored in localStorage by the lib; `decorateFetchHTTPClient` wraps `fetch` to attach `Authorization: Bearer …`, passed into `fetchExplorer`. Endpoints: `lichess.org/oauth` + `lichess.org/api/token`. `clientId` is a stable identifier (`howthehorseymoves`); `redirectUrl` is the current page minus query, so it works on localhost and prod without config. The whole tool is gated behind a "Sign in with Lichess" button
- **Castling UCI gotcha**: the Lichess explorer encodes castling as king-takes-rook (`e1h1`/`e1a1`, the Chess960 convention), while the board engine uses the king's destination (`e1g1`/`e1c1`). `toLichessUci`/`fromLichessUci` in `+page.svelte` convert at the Lichess boundary (matching moves, the `play=` param, and explorer-row clicks); without this, castling matches nothing → shows 0% and an unmatched `e1-g1` label
- `probability.ts` — pure helpers: `nodeTotal`, `moveProbability`, `movePlayRate`, `lineTotals` (products split by mover, honoring the Skip flag, plus `pathProb` = both movers combined)
- **Two kinds of number, and they must not be mixed**: the per-mover figures ("get here X% as White" = product of *Black's* plies) hold your own moves as given, so only the opponent's replies are chance. The bottom pair — the position's share of the database vs `pathProb` — leaves *every* move to chance, which is what makes them comparable to each other. Never present a per-mover figure next to a whole-database figure as if they were the same measure
- **Node vs edge counts (the transposition gotcha)**: the explorer is *position*-keyed (Zobrist), so a response's **top-level** `white/draws/black` is the total games that ever reached that position **by any move order** (`nodeTotal`), while `moves[].white/draws/black` are **edge** counts — games that were at this position *and played that move*. Multiplying edge counts along a line therefore walks one rigid move order and misses transpositions (`e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6` misses the games that got there via `e4 c5 Nc3 d6 Nf3 Nf6 d4 cxd4 Nxd4`). The move-by-move percentages keep that per-order meaning on purpose; alongside them the page shows the position's **overall** frequency, `nodeTotal(current) / rootGames`, which is transposition-complete. `rootGames` (the start position's total = the whole database) is cached against `settingsKey(settings)` and refetched when the DB/rating/speed filters change; the overall figure hides itself rather than divide by a stale denominator. There is deliberately no per-mover split of the overall figure — a position total says how many games arrived, not whose move-order freedom got them there
- `board-to-fen.ts` — `boardToFen()` serializer (the app's `parseFen` has no inverse); used for the "open in Lichess analysis" link and the "Copy FEN" button
- `src/routes/probabilitizer/+page.svelte` — three-column layout (board + controls + paste | percentages + scrollable "Your line" | Database). Reuses the shared `Board` (`playableColors={['w','b']}`) for click/drag input. Paste-a-line uses `parseGamePgn` + `extractMainLine` (so it tolerates `{comments}`, `[%cal]`/`[%csl]` arrows, `$N` NAGs, `!?` marks, and `(variations)`), then replays the main line with a fetch per ply and a ~300ms gap to respect rate limits. Masters/Lichess DB toggle with rating + time-control filters; the rating buckets are bands (1600 = 1600–1800), not floors. Keyboard: `F` flips, `←` undoes. No persistence
- **Sticky-header gotcha**: a `position: sticky` table header needs a background of its own (`--page`) or scrolled rows show through it; also use `border-collapse: separate` (sticky headers misrender under `collapse`)

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
- **Colours, type and sizes come only from the tokens in `src/app.css`** (`--page`, `--surface`, `--ink`, `--correct`, `--size-body`, …; full list under Design system). Never write a hex/`rgb()` colour, a `font-family`, a font size under 14px or italic in a component — `npm test` fails. Reach for a `ui/` or `board/` component before styling a new button, card, back link or overlay

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

- Many students using this app cannot read yet. All interactive elements (puzzles, lessons, trainers) should be figure-out-able from visual cues alone: arrows, colors, icons, and board state. Text instructions are helpful for those who can read but must not be the only signal. Use universal symbols (trophies, ✓/✗, blue for right and coral for wrong — never red/green, which many colour-blind students can't tell apart) over text labels. Colour is never the only signal: right/wrong always comes with a ✓ or ✗
- Landing page shows a curriculum path: 8 levels, rendered as a grid three cards wide, so **a level holds at most 9 cards: 8 stops and then its bot** (`npm test` enforces it). When a level is over, push its last stop to the front of the next level so the journey order stays the same; only Level 8 has a spare place. Of the five blindfold mates, only Q vs K ("Blindfold Mate") is on the path; the rest are on `/vision`. Knight marker sits on the first incomplete stop. "Continue" button links to it. Everything is unlocked (no gating). Nav bar hubs (Practice, Study, Vision, etc.) remain for direct access
- **Every level ends with its bot — the boss of that level.** The eight `play-*` stops are the closing stop of their chapter, and they report progress (`bot-beaten-{level}`), so the knight marker rests there until the student wins. Keep a new bot last in its chapter; a mid-chapter bot parks the marker before the level's content is done
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
- Run `npm test` after any styling change — it checks the design-system rules — and after any puzzle or position edit — it checks every puzzle loads and every FEN is a legal start
- The user often makes hand-edits to puzzle files while Claude works — always `git diff --stat` before committing and include their changed files
- When pushing fails due to remote changes, `git pull --rebase` then push again
- Do NOT try to programmatically verify checkmate positions — push and let the user test in-browser
- Claude generates PGNs from memory and they often contain errors (wrong moves mid-game). Always flag generated PGNs as needing user verification. Major chess databases (chessgames.com, Wikipedia, 365chess) block WebFetch (403), but smaller sites may work. If a PGN fails parsing, diagnose the exact failing move and let the user fix it rather than burning tokens on speculative web searches
- PGN annotations: `{comments}`, NAGs (`!`, `!!`), arrows (`[%cal Ge2e4]`). Lichess colour letters G/R/Y/B are drawn as good/danger/note/other (`LICHESS_MARKS` in `$lib/board-marks`), so a green Lichess arrow shows in the app's blue
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
- Breadth order ("3 moves at a time") changes only which new moves come first — arrows are always for new moves. Step is a fixed `STEP = 3`; a stage cutoff based on database statistics (like the probabilitizer's line odds) is a future idea, and would need stats precomputed offline since the live explorer requires a Lichess login

## Bot System (`src/lib/logic/bot.ts`)

**An 8-rung ladder, one bot per curriculum level.** Strength is config, not code: `BOT_SPECS` is a table of `BotSpec` rows, and `pickBotMove()` reads the row rather than branching per level. Adding a rung = adding a row + a character + a curriculum stop. No new algorithm.

Each bot is the **boss of its curriculum level** — the closing stop of that chapter (`curriculum.ts`).

| Rung | Level | Character | `BotLevel` | `search` | `slack` | `depth` | mate-scan | book | ms/move | beats rung below |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Foal | The Sloth | `random` | random | — | — | — | — | 0.1 | — |
| 2 | Colt | The Chick | `greedy` | greedy | — | — | — | — | 0.2 | 65% |
| 3 | Trotter | The Frog | `loose` | heuristic | 1.4 | — | off | — | 0.7 | 81% |
| 4 | Cantering | The Rabbit | `careful` | heuristic | 0.6 | — | on | — | 9.8 | 88% |
| 5 | Galloper | The Panda | `basic` | heuristic | 0 | — | on | — | 10.4 | 88% |
| 6 | Destrier | The Monkey | `sharp` | minimax | 0.7 | 2 | — | — | 13.9 | 77% |
| 7 | Stallion | The Bear | `intermediate` | minimax | 0 | 2 | — | — | 11.5 | 88% |
| 8 | Charger | The Owl | `expert` | minimax | 0 | 3 | — | yes | 290 | 85% |

Times are avg ms/move on a dev desktop; expect several times this on a Chromebook. The win rates are 24-game self-play matches against the rung below (stronger side plays Black). **Re-run `scripts/bot-ladder-match.ts` after touching any knob** — the whole point of the ladder is that each step is felt, and self-play is the only way to know before a student finds out. Ideas for making the bots distinctive by *playstyle* rather than strength are parked in `bot-personality-ideas.md`.

- **`slack` is the main strength knob**, not depth — depth alone gives only two or three usable steps. A bot picks at random among all moves scoring within `slack` pawns of the best, so it plays second-best moves rather than random ones (a blunder-rate design was rejected: it makes a bot feel broken, not weak). `slack: 0` is full strength, so `basic` and `intermediate` behave exactly as they always have
- **Slack ceiling on heuristic bots**: `scoreMove` penalizes hanging a piece by `value * 5` while material is `value * 10`, so heuristic slack above ~1.4 buys knight blunders and above ~2.5 rook blunders. Keep it under 1.5. Minimax slack is in real centipawns and means what it says. `slackPoints()` does the ×10 / ×100 conversion
- **Cost is not where you'd guess.** Two counter-intuitive facts, both measured:
  - `avoidsMateIn1` costs a heuristic bot ~10x (`loose` 0.7 ms → `careful` 9.8 ms) — the scan generates every opponent reply and tests checkmate on each. Turning it off makes a low rung both weaker *and* cheaper, which is why it's a knob
  - **Leaves dominate the minimax cost, and the leaf must not generate moves.** `minimax` handles `depth === 0` *before* calling `getAllLegalMoves`, using `hasLegalMoves()` (`attacks.ts:125`) — same predicate, but it early-exits on the first legal move instead of legality-checking all ~35. That one ordering is worth **11x** (depth-2 was 186 ms/move before it, 11.5 ms after). Terminal detection is unaffected: mate and stalemate are both still scored correctly at the horizon. Do not "simplify" this back into a single movegen at the top of the function
- `pickBotMove` runs **synchronously on the UI thread** (`use-game.svelte.ts:189`, inside a 400 ms `setTimeout`). While it runs the avatar's thinking animation and speech bubble are frozen, so a slow search reads as a hung UI, not as a bot thinking. If more visible "thinking time" is wanted, lengthen the artificial delay — don't slow the search. Anything past depth 3 needs a Web Worker first
- `search` modes: `random` (uniform), `greedy` (biggest capture available else random — never checks safety, so it walks onto defended squares *systematically*, a pattern students can learn), `heuristic` (one-ply `scoreMove`), `minimax` (alpha-beta to `spec.depth` plies with PSTs)
- `scoreMove` terms: captures (trade up), checkmate delivery (+1000), checkmate defense (−500, gated on `avoidsMateIn1`), piece safety, check bonus, center control, castling, pawn advancement
- **Even depths are safer than odd ones** without a quiescence search: an odd depth ends on the bot's own move, so it sees its capture but not your recapture. Depth 3 was measured before shipping and did *not* suffer from this — it lifted the Owl from 63% to 85% against the Bear — but re-measure before assuming a deeper search is a better one
- Minimax detail: standard simplified PSTs from the Chess Programming Wiki; captures sorted first for pruning. `applySimpleMove` drops castling rights and the en passant square below the root, so castling is invisible to the search (known, accepted)
- **Opening book** (`src/lib/logic/opening-book.ts`): only the Owl uses it. ~22 lines of plain PGN, parsed once on first use (same lazy pattern as `kpk-bitbase.ts`) into a `boardToKey()`-keyed map, so it's transposition-complete for free. The bot always plays Black, so only Black replies are stored. Returns `null` out of book → normal search. Costs zero search time and matters a lot, because students' games are decided in the first ten moves
- `createGameState(botLevel)` in `use-game.svelte.ts` creates the game state factory; `GameShell` passes it through
- Play page (`/play`) renders the ladder from `BOT_LADDER` + `BOT_SPECS` + `BOT_CHARACTERS` — difficulty pips (`spec.rung` of 8) and a trophy, both readable without text. Accepts `?level=<BotLevel>`
- **Resigning** (`game.resign()` in `use-game.svelte.ts`, button in `GameShell`) ends the game with `result: 'resigned'`. Two taps — a flag button arms it, a red ✓ confirms — because students tap fast and a one-tap resign would end games by accident. It works while the bot is thinking too: the queued bot move re-checks `result` before it lands, so the resignation always sticks. A white flag overlays the board (the signal a non-reader can read), the bot shows its `resign` reaction, and nothing is written to localStorage — only a checkmate counts as beating a bot
- **Beating a bot** writes `bot-beaten-{level}` = `'3'` to localStorage (from `GameShell`, on `result === 'checkmate-white'`). `'3'` rather than a boolean because `getStopStars()` parseInts localStorage progress as a star count, so the existing `{ type: 'localStorage' }` curriculum source just works
- `src/lib/puzzles/types.ts` keeps its own narrower `bot: "random" | "basic"` union for `ConversionPuzzle` — deliberately not widened to `BotLevel`
- Promotion: player gets a picker overlay (Q/R/B/N) when pawn reaches last rank; bot auto-promotes to queen
- Draw detection: stalemate, threefold repetition, 50-move rule (halfmove clock), insufficient material (K vs K, K+B/N vs K, K+B vs K+B same-color bishops). Matches Lichess rules
- Click-to-move: all interactive board wrappers must use separate `dragFrom` state for drag tracking, keeping `selectedSquare` independent. Never clear `selectedSquare` in `onDragEnd` — that breaks click-click

## Bot Characters (`src/lib/characters/`)

- Each bot level has a `BotCharacter` with name, avatar (Kenney CC0 sprite), accent color, description, and reaction text pools. All 8 rungs have one; the `BotLevel` key is the *engine*, the character is the persona wrapped around it
- The registry stays `Partial<Record<BotLevel, BotCharacter>>` even though it's now complete — narrowing it would make GameShell's no-character fallback dead code, and that branch is the only place `statusText` renders
- The `resign` reaction pool is for when the *player* gives up. Keep those lines kind and never gloating — the bot does not celebrate (`triggerAnimation('idle', 0)`), unlike a checkmate win
- Reaction system in GameShell uses `$effect` blocks watching `game.moveHistory`, `game.waitingForBot`, and `game.result` to trigger animations + speech bubbles
- CSS keyframe animations on the avatar: idle bob, thinking rock, capture bounce, captured shake, check jump, move tilt, win celebrate, lose droop
- Adding a new character: add entry to `BOT_CHARACTERS` in `bots.ts`, place sprite PNG in `static/characters/`
- Art assets from [Kenney's Animal Pack Remastered](https://kenney.nl/assets/animal-pack-remastered) (CC0, by Kenney Vleugels)
