# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"How The Horsey Moves" — a free, open-source chess puzzle trainer for young students in classroom settings. Built with Next.js 16 + React 19 + TypeScript (strict mode). No chat, no ads, no memberships, no server compute — everything is client-side. Deployed to Vercel.

## Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

**Three-layer design**: chess logic → state management → React UI.

### Chess Logic (`src/lib/logic/`)
- `types.ts` — Core types: `PieceKind`, `PieceColor`, `SquareId` (union of all 64 squares), `BoardState` (Map-based, immutable). FEN parser via `parseFen()`
- `moves.ts` — Pure functions for move generation per piece type. Sliding pieces (R/B/Q) use direction arrays; step pieces (K/N) use offset arrays; pawns have special forward/capture/en-passant logic
- `attacks.ts` — `isSquareAttacked()`, `isInCheck()`, `isCheckmate()`, `isStalemate()`, `getLegalMoves()`, `getAllLegalMoves()`
- `pgn.ts` — PGN parser for model games. Exports `parseSan()` and `applyMove()` (also used by openings parser). Supports comments (`{text}`), NAGs (`!`, `!!`), arrows (`[%cal Ge2e4]`)

### Puzzle System (`src/lib/puzzles/`)
- `types.ts` — `Puzzle` interface: setup (FEN or placements), targets, solution, star thresholds, hints, arrows, opponent responses
- Per-piece files (`rook.ts`, `bishop.ts`, etc.) + `castling.ts`, `enpassant.ts`, `checkmate.ts`, `tactics.ts`
- `index.ts` — Registry with `getPuzzlesForPiece()`, `PIECES`, `CATEGORIES` (with `comingSoon` support for subcategories)
- Three puzzle modes: `"reach-target"` (default), `"checkmate"`, `"checkmate-bot"`
- Reach-target supports multi-step solutions with `opponentResponses` (for tactics puzzles where the student demonstrates "the point" — e.g., pin then capture)

### Model Games (`src/lib/games/`)
- `types.ts` — `ModelGame` interface
- `index.ts` — Game data with annotated PGN strings

### Opening Trainer (`src/lib/openings/`)
- `index.ts` — PGN variation parser (`parseOpeningPgn`), line extractor, opening data
- Parses `(variation)` syntax into a tree, extracts all root-to-leaf lines
- Student plays one color; opponent moves auto-play with animation
- Learn mode: arrows show each move. Practice mode: arrows only on mistakes

### State (`src/lib/state/`)
- `progress-context.tsx` — React Context + Reducer, persists to localStorage (`"horsey-progress"`). Sequential unlock: puzzle N requires N-1 completed
- `use-puzzle.ts` — Custom hook for gameplay: board state, move validation, drag-and-drop, star calculation, side-effects, multi-step solution validation

### UI (`src/components/`)
- `board/Board.tsx` — SVG-based 800x800 board with drag-and-drop, click-to-move, valid move indicators, target stars, arrows, slide animations. `readOnly` prop skips animations (used by game viewer)
- `puzzle/PuzzleShell.tsx` — Main puzzle container. Hides target stars when `puzzle.arrows` is set
- `game/GameViewer.tsx` — PGN game viewer with move list, auto-play, keyboard nav, comments, arrows
- `opening/OpeningTrainer.tsx` — Opening repertoire trainer with learn/practice phases

### Routing (`src/app/`)
- `/` — Landing page with piece cards, category cards, play/tactics/model games/openings links
- `/learn/[piece]` — Puzzle list (or subcategory list for categories like checkmate/tactics)
- `/learn/[piece]/[puzzleId]` — Individual puzzle
- `/games`, `/games/[gameId]` — Model game viewer
- `/openings`, `/openings/[id]` — Opening repertoire trainer
- `/play` — Play vs computer

## Deployment

Vercel auto-deploys on `git push` — no manual deployment steps needed.

## Key Conventions

- Board state is immutable — new `BoardState` created per move, never mutated
- Chess piece SVGs live in `public/pieces/` named `{color}{piece}.svg` (e.g., `wR.svg`, `bN.svg`)
- Path alias: `@/*` maps to `src/*`
- Tailwind CSS 4 for styling
- No backend/database — all state is client-side localStorage
- Obstacle pieces on puzzles are white pawns (so they can't be captured by the player's white piece)
- Puzzle `setup` accepts either a `PiecePlacement[]` array or a FEN string
- FEN strings auto-extract castling rights and en passant square from fields 3-4
- This codebase is designed to be hand-maintained by a human chess teacher — prefer simple, readable puzzle formats
- Avoid `eslint-disable` comments — fix the root cause instead

## Workflow

- After completing a task, always offer to commit and push so Vercel can deploy
- Run `npm run build` before committing to catch errors early
- The user often makes hand-edits to puzzle files while Claude works — always `git diff --stat` before committing and include their changed files
- When pushing fails due to remote changes, `git pull --rebase` then push again
- Do NOT try to programmatically verify checkmate positions — push and let the user test in-browser
- PGN annotations: `{comments}`, NAGs (`!`, `!!`), arrows (`[%cal Ge2e4]`). Lichess color convention: G=green, R=red, Y=yellow, B=blue

## Puzzle Authoring Notes

- The user is a chess teacher — puzzle accuracy matters. When creating checkmate puzzles, carefully trace all king escape squares
- Claude can help with puzzle infrastructure (multi-move support, opponent responses, UI) but the user should verify chess positions for tactical correctness
- Tactics puzzles use arrows (not target stars) to show tactical relationships, and `opponentResponses` for multi-move sequences
- Subcategories can be marked `comingSoon: true` in CATEGORIES to show as grayed-out placeholders
- Checkmate categories: Queen Takes f7, Queen-Bishop Battery, Lolli's Mate, Smothered Mate, Back Rank Mate, Rook Ladder, Queen & King
- Tactics categories: Pins, Skewers, Forks, Removing the Defender, Discovered Attacks (most currently Coming Soon)
- Puzzle IDs use a prefix matching their category (e.g., `tactics-pin-01`, `checkmate-qb-01`)

## Opening Trainer Notes

- PGN with variations: `1.e4 e5 2.Nf3 Nc6 (2...d6 3.d4) 3.Bb5` — parenthesized sections are alternative lines
- Student plays one side (white), opponent auto-responds
- Lines are trained sequentially: main line first, then variations rewind to branch point
- Learn phase shows arrows; practice phase hides them unless the student makes a mistake
