# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"How The Horsey Moves" — an interactive chess piece movement trainer built with Next.js 16 + React 19 + TypeScript (strict mode). Players learn how each piece moves through progressive puzzles across 9 categories. Deployed to Vercel.

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
- `types.ts` — Core types: `PieceKind`, `PieceColor`, `SquareId` (union of all 64 squares), `BoardState` (Map-based, immutable)
- `moves.ts` — Pure functions for move generation per piece type. Sliding pieces (R/B/Q) use direction arrays; step pieces (K/N) use offset arrays; pawns have special forward/capture/en-passant logic
- `attacks.ts` — `isSquareAttacked()`, `isInCheck()`, `isCheckmate()`, `isStalemate()`, `hasLegalMoves()`

### Puzzle System (`src/lib/puzzles/`)
- `types.ts` — `Puzzle` interface: setup (piece placements), targets (squares to reach), solution, star thresholds, optional hints/en-passant/castling/opponent moves
- Per-piece files (`rook.ts`, `bishop.ts`, etc.) — Each exports puzzles for that category
- Special rule files: `castling.ts`, `enpassant.ts`, `checkmate.ts`
- `index.ts` — Registry with `getPuzzlesForPiece()`, `getPuzzle()`, piece metadata

### State (`src/lib/state/`)
- `progress-context.tsx` — React Context + Reducer, persists to localStorage (`"horsey-progress"`). Tracks per-puzzle completion, best stars, best moves. Sequential unlock: puzzle N requires N-1 completed
- `use-puzzle.ts` — Custom hook for gameplay: board state, move validation, drag-and-drop, star calculation, en passant/castling side-effects, checkmate/stalemate detection

### UI (`src/components/`)
- `board/Board.tsx` — SVG-based 800×800 board with drag-and-drop, click-to-move, valid move indicators, target stars
- `puzzle/PuzzleShell.tsx` — Main puzzle container orchestrating board, controls, hints, success overlay
- `progress/PieceCard.tsx` — Home page piece selection cards with progress display

### Routing (`src/app/`)
- `/` — Piece selection grid
- `/learn/[piece]` — Puzzle list for a piece
- `/learn/[piece]/[puzzleId]` — Individual puzzle

## Deployment

Vercel auto-deploys on `git push` — no manual deployment steps needed.

## Key Conventions

- Board state is immutable — new `BoardState` created per move, never mutated
- Chess piece SVGs live in `public/pieces/` named `{color}{piece}.svg` (e.g., `wR.svg`, `bN.svg`)
- Path alias: `@/*` maps to `src/*`
- Tailwind CSS 4 for styling
- No backend/database — all state is client-side localStorage
- Obstacle pieces on puzzles are white pawns (so they can't be captured by the player's white piece)
- Puzzles support three modes: `"reach-target"` (default), `"checkmate"`, and `"checkmate-bot"`
- Puzzle `setup` accepts either a `PiecePlacement[]` array or a FEN string (e.g., `"6k1/5ppp/8/4N3/8/8/8/6K1 w - - 0 1"`)
- FEN strings also auto-extract castling rights and en passant square from fields 3-4
- This codebase is designed to be hand-maintained by a human chess teacher — prefer simple, readable puzzle formats (FEN over verbose JSON when positions are complex)
- Avoid `eslint-disable` comments — fix the root cause instead (e.g., use React `key` for state reset instead of useEffect)

## Workflow

- After completing a task, always offer to commit and push so Vercel can deploy
- Run `npm run build` and `npm run lint` before committing to catch errors early
- Lint must pass clean (zero warnings, zero errors) before committing
