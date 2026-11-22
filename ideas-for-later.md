# Ideas for after the current work

Parking lot, started 2026-11-21. Nothing here is built. Do it after the games
library, the stored mistake check and Studies (see the plan in CLAUDE.md's
Engine section).

# Analysis on the smartboard

The teacher now analyses on a touchscreen smartboard, and would one day like
everything used for analysis on this site.

## 1. Draw on the board by touch

**Wanted:** touch and hold, then drag, to draw an arrow; circle a square the
same way; more than one colour.

**Today:** `board/Board.svelte` draws arrows with a right-click drag only, all
in one colour (`MARK.good`, Lichess's green), and has no circles. A touchscreen
has no right-click, so on the smartboard nothing can be drawn.

Notes for building it:
- **Hold, then drag.** A finger that moves straight away moves a piece, as now.
  A finger held still for about half a second, then moved, draws an arrow
  instead. Held and let go on the same square, it circles that square (Lichess
  circles a square on a right-click). Drawing the same arrow or circle again
  removes it, as right-click arrows do now.
- **Colours.** Lichess picks the colour with Shift/Alt/Ctrl, which a smartboard
  doesn't have. Something to tap instead, e.g. four colour dots in the sidebar
  (`MARK.good`, `danger`, `note`, `other`), the last one picked staying picked.
- The browser's own long-press menu has to stay away (the board already blocks
  `contextmenu`), and the page mustn't scroll while drawing (`touch-action`).
- Circles are `highlight(squares, color, 'ring')` from `$lib/board-marks`,
  which the board can already draw.
- Same drawing as the study editor's draw mode (Phase 5 of the plan), so build
  it once, in Board.svelte, for both.
- Try it on the smartboard itself: how long a hold feels right is a
  measurement, not a guess.

## 2. Masters and Lichess databases beside the board

**Wanted:** the opening explorer on the analysis board: the masters database,
and the Lichess database for anyone logged in.

**Already in the repo:** the Probabilitizer talks to the Lichess opening
explorer (`src/lib/probabilitizer/lichess.ts`, both `masters` and `lichess`),
with a Lichess login of its own (`src/lib/probabilitizer/auth.ts`, in the
browser), because since Feb 2026 the explorer refuses requests without one.

Notes for building it:
- An explorer panel in the sidebar under Stockfish (the board must not move):
  each move with its number of games and a white/draw/black bar; tap a move to
  play it.
- **The login.** The site's own Lichess login (`server/lichess.ts`) uses the
  token once, to learn the username, then revokes it, so it can't be reused
  for the explorer. Either use the Probabilitizer's login in the browser, or
  keep the token on purpose. Decide that with the teacher.
- **Check the school network first:** chessdb.cn is blocked there. See whether
  `explorer.lichess.ovh` gets through before building anything.

## 3. Ask the teacher about analysis

"All the things I use for analysis": ask for the full list (what's open on the
smartboard during a lesson) before designing the panel.

# Records for the trainers

**Wanted** (the teacher, "if feasible"): records for trainers like Color of
Square.

**Already there:** every timed Vision trainer saves its best score and best
stars on the device (`{key}-best`, `{key}-best-stars`, e.g.
`blindfold-color-best`, through `saveBest` in `state/storage.ts`). With a
Lichess login they sync to the database, keeping the higher number
(`ruleFor()` in `sync/merge.ts`), so a student's record follows them to any
Chromebook.

**Not there yet, and feasible:**
- **A history:** each round's score and date, not just the best, so progress
  over weeks can be seen. Needs a new kind of saved entry and a merge rule in
  `sync/merge.ts` that keeps every round from both copies. Small: one round is
  about 20 bytes.
- **Records the teacher can see:** a teacher-only page listing each logged-in
  student's bests per trainer (a class leaderboard), read from
  `horsey_users.progress`. Only students who log in would show.
- Ask the teacher which of the two is meant (or both).
