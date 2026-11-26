# Homework

Everything still to do, in one place: what needs the teacher (positions,
PGNs, words, decisions), what Claude can do, ideas parked for later, and what's
done. Last full-site audit: 2026-11-26.

**Audit, 2026-11-26, in short:** `npm test` (163 tests), `npm run check` and
`npm run build` all pass. A headless browser visited all 327 pages the site
links to, at 1366×768 and at phone width: no errors, no dead links, nothing
wider than the screen. The board is the same size and in the same place on 171
pages (the editor is the one exception, below). So what's below is mostly
about content: what's thin, what's missing, and a few loose ends.

# For you

## Games

- **World Championship 2026.** After each round, export the broadcast from
  Lichess again and save it over `src/lib/games/pgn/wc-2026.pgn`. A game still
  being played (result `*`) is left out by itself, so the new game shows up on
  `/games` once it's finished and pushed.
- **Adding more games:** put them in a Lichess study (one chapter a game),
  export it, and drop the file in `src/lib/games/pgn/`. Claude adds one line
  to load it, and the study's name becomes its section on `/games`. Lichess's
  own analysis sentences ("Mistake. Nf3 was best.") are left out on the site;
  the `??` marks and the better line stay.

### Model Games Taken Out (3)

Their PGNs wouldn't play, so they were removed from `src/lib/games/index.ts`. To bring one back, add it with a PGN you've checked:

1. **Morphy vs Le Carpentier, New Orleans 1849.** The plan said smothered mate, but the PGN ended Qd7#, so it might have been the wrong game entirely. It failed at 15...Kc7, with Black's own pawn on c7.

2. **Short vs Timman, Tilburg 1991.** The famous king walk game. It failed at 31.Kh1, because the bishop on e4 controls h1 down the empty f3–g2 diagonal.

3. **Kasparov vs Topalov, Wijk aan Zee 1999.** It failed at 19.Qa2, because White's own pawn on b2 blocks the queen.

### New Model Games to Add (4)

Add to `src/lib/games/index.ts` with correct PGN:

4. **Lasker vs Thomas, London 1912** — 18 moves. The king is dragged by force from g8 to g1, and every sacrifice is check. The most visual king hunt ever.

5. **Réti vs Tartakower, Vienna 1910** — 11 moves. A queen sacrifice on d8, then a double check, and the bishop mates on d8. A real game, not a trap.

6. **Anderssen vs Dufresne, Berlin 1852** — "The Evergreen Game." ~24 moves. Anderssen's other famous sacrificial attack.

7. **Blackburne Shilling Gambit trap** — ~8 moves. 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! — if White falls for it, quick mate. Good trap to know.

(Any of these can also go in a Lichess study file, as above; a broken PGN
now fails `npm test` before it's pushed.)

## Openings

- **A line can stop where it transposes.** When a line of a study reaches a
  position another line already has by other moves, the trainer stops it
  there and shows ⇄ with the other move order. Moves written past that point
  are learned in the other line (they're the same moves in the same position).

## Positions

### Endings Still Without a Set

- **Zugzwang** — 2-3 simple positions where the side to move loses. Goal: find the move that creates zugzwang.

### Thin sets

Sets that are short next to the 10–20 puzzles most have. Fine if it's on
purpose:

| Set | Puzzles |
|---|---|
| Lucena Position | 1 |
| Pawn Races | 2 |
| Réti Study | 3 |
| Danger Zones | 10 |

### Topics the site doesn't teach yet

From comparing the path with the topics a typical club course covers, in
order of difficulty. "Fits" is where it would sit in the spiral; "Format" is
the kind of activity the site already has that could carry it; "Lichess theme"
is the puzzle-database theme `scripts/filter-lichess.py` could pull candidates
from (the Lichess puzzles are CC0). A blank theme means the positions would
have to be yours.

**Material and defending.** The biggest gap: the path teaches how to attack
and mate, but almost nothing about keeping your own pieces.

| Topic | We have | Fits | Format | Lichess theme |
|---|---|---|---|---|
| Taking a piece left undefended | The Chick bot punishes it; no puzzles | Level 2–3 | Puzzle set | `hangingPiece` |
| Saving an attacked piece: move it, guard it, block, or take the attacker | Danger Zones is the nearest | Level 2–3 | Puzzle set | `defensiveMove` |
| Piece values, and which trades win | Nothing | Level 2–3 | Lesson (like How to Win) | |
| Counting attackers and defenders: is the capture safe? | Who's Guarding (Vision, Level 13) | Level 3–4 | Puzzle set | `hangingPiece` |
| Stopping a mate threat | Nothing | Level 4–6 | Puzzle set | `defensiveMove` |
| Getting out of a fork | Nothing | Level 7–8 | Puzzle set | `defensiveMove` + `fork` |
| Getting out of a pin | Nothing | Level 5–7 | Puzzle set | `defensiveMove` + `pin` |

**Rules and notation.**

| Topic | We have | Fits | Format | Lichess theme |
|---|---|---|---|---|
| Draws: repetition, the 50-move rule, not enough pieces to mate | Play knows them; nothing teaches them. Stalemate is in How to Win | Level 3–5 | Lesson | |
| Reading and writing moves (Nf3, exd5, O-O, +, #) | Name the Square; Blindfold openings use notation | Level 3–5 | A Vision-style trainer: the board shows a move, type it (no positions needed) | |

**Openings.**

| Topic | We have | Fits | Format | Lichess theme |
|---|---|---|---|---|
| Opening principles: develop, the centre, castle early | Lines to memorize only | Level 3–4 | Puzzle set (pick the developing move) | |
| Punishing early mistakes / traps | Scholar's, Fool's, Légal's, Budapest | Level 4–8 | Model games, puzzle set | `opening` + `short` |

**Tactics.** The site has pins, forks, skewers, removing the defender and
discovered attacks. Next, roughly easiest first:

| Topic | We have | Fits | Format | Lichess theme |
|---|---|---|---|---|
| Seeing the opponent's threat; making one | Nothing | Level 5–8 | Puzzle set | |
| Trapping a piece | Nothing | Level 8–10 | Puzzle set | `trappedPiece` |
| Attacking a pinned piece | Pins | Level 8–10 | Pins 2 | `pin` |
| X-ray | Nothing | Level 10–12 | Puzzle set | `xRayAttack` |
| Under-promotion | Nothing | Level 10–12 | Puzzle set | `underPromotion` |
| More mate patterns: Anastasia, Arabian, Boden, dovetail, hook, two bishops | Seven patterns, plus Mate in 1 and 2 | Level 9–14 | Checkmate sets | `anastasiaMate`, `arabianMate`, `bodenMate`, `dovetailMate`, `hookMate`, `doubleBishopMate` |
| Deflection (forcing a defender away) | Removing the Defender (capturing it) | Level 11–13 | Puzzle set | `deflection` |
| Decoy (luring a piece to a bad square) | Nothing | Level 11–13 | Puzzle set | `attraction` |
| Double check | Discovered Attacks is the nearest | Level 12–13 | Puzzle set | `doubleCheck` |
| In-between moves | Nothing | Level 12–14 | Puzzle set | `intermezzo` |
| Interference, clearance, blocking a line | Nothing | Level 13–14+ | Puzzle sets | `interference`, `clearance` |
| Mate in 3 | Mate in 1 and 2 | Level 14+ | Puzzle set | `mateIn3` |

**Endings.** Strong already: every basic mate, KPK both ways, the square,
key squares, opposition, breakthrough, Lucena, Philidor, Réti, the wrong
bishop. Missing:

| Topic | We have | Fits | Format | Lichess theme |
|---|---|---|---|---|
| Zugzwang | (above) | Level 8–10 | Puzzle set | `zugzwang` |
| Queen vs a pawn on the 7th | Nothing | Level 10–12 | Conversion puzzle vs the bot | |
| Rook vs pawn | Nothing | Level 11–13 | Conversion puzzle | `rookEndgame` |
| Rook endings beyond Lucena and Philidor (cutting the king off, active rook) | Lucena, Philidor | Level 13–14+ | Conversion puzzle | `rookEndgame` |
| Bishop or knight against pawns | Wrong Bishop | Level 12–14 | Puzzle set | `bishopEndgame`, `knightEndgame` |
| Queen endings | Nothing | Beyond 14 | | `queenEndgame` |

**Plans and position (middlegame).** Nothing on the path yet; the model
games are the natural place. Topics: active pieces, weak pawns (isolated,
doubled, backward), open files, the seventh rank, strong squares, bishop or
knight, attacking a king left in the middle (Lichess `exposedKing`), small
plans (improve your worst piece). The 1972 games are full of these.

**Where the site is ahead:** Vision (22 trainers; most courses have a few
pages of board-vision exercises), the bitbase-backed endgame trainers, the
14-bot ladder, and memorizing openings and games with spaced review.

## Words

- **`words-to-write.md` is still all blank**: the bots' speech bubbles and
  the Vision how-to-play lines. Until it's filled in, the bots only animate.
- **Not checked by the words test yet:** About, Breathwork, the
  Probabilitizer, and the eval-diffs report (`NOT_CHECKED` in
  `src/words.test.ts`). Each has sentences that aren't yours or aren't listed.

## Decisions

- **No openings on the path after Level 6.** The spiral gives every level an
  opening, but the path has only four: Scholar's Mate and three that are one
  move long (`first-e4` = 1.e4, `first-e4-e5`, `first-d4-d5`), waiting for
  your lines. Levels 7–14 have none. The 1.e4/1.d4 repertoires, the Slav and
  c6 Qb6 vs the London are only on `/openings`.
- **18 path stops never get a ✓**: the four path openings, the twelve model
  games, Knight Routes and Knight Gauntlet. Openings and games now save
  progress per move, so an opening could get its ✓ when every move is known.
  A model game could get one from its best Test, if Test should be part of
  the path (it opens to watch now, as you chose).
- **"Rook Ladder" is two things.** The checkmate pattern set
  (`checkmate-rook-ladder`) and, on `/endings`, the two rooks vs king trainer
  (`endings-krrk`, called "2 Rooks vs King" on the path). Rename one?
- **Two old hubs.** `/practice` is reached only from the "Back to practice"
  link on a category page (`/learn/checkmate`, …), and `/checkmates` only by
  its address; `/tactics` already lists the checkmate patterns. Keep, fold
  into `/tactics`, or remove?
- **Level 14** has only 4 stops and no pattern; Levels 7 and 8 have 4. Room
  for some of the topics above.

# For Claude

- **Back after a reload goes to the old mode.** In an opening or game:
  reload in a mode (the lobby opens, as it should), open another mode, press
  Back: it returns to the mode from before the reload, not the lobby. The
  browser keeps the reloaded page's saved state. Fix: clear `openingPhase`
  with `replaceState` when the trainer opens on its lobby.
- **The editor's board is lower than every other board** (260 px from the
  top at 1366×768, against 108 everywhere else): something sits above it.
  Every other board screen puts the rest in the sidebar.
- **CLAUDE.md doesn't match the nav**: it lists Learn, Tactics, Checkmates,
  Endings, Play, Vision; the nav is Learn, Tactics, Study, Play, Vision. The
  `/study` and `/practice` hubs aren't described.
- **`scripts/filter-lichess.py` knows six themes** (fork, skewer,
  capturingDefender, discoveredAttack, pin, pawnEndgame). Each new set above
  needs its theme added to `CATEGORIES` there.
- **The eval-diffs report's page is a 1 MB script** (its data), and the
  build warns about it. Only that page loads it. Leave it, or load the data
  when the page opens.

# Ideas for later

Parking lot, started 2026-11-21. Nothing here is built.

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
- **The login.** The explorer needs a Lichess sign-in; the Probabilitizer's
  (`src/lib/probabilitizer/auth.ts`, in the browser only) could be shared.
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
`blindfold-color-best`, through `saveBest` in `state/storage.ts`).

**Not there yet, and feasible:**
- **A history:** each round's score and date, not just the best, so progress
  over weeks can be seen, on the device. Small: one round is about 20 bytes.

# Done

- **Greco Mate** and **Greco Greek Gift**: their PGNs were fixed and both now play to the end.
- **Lucena, Philidor, Réti, Wrong Bishop, Pawn Races**: each is an endings set on `/endings` and on the path. Philidor and Wrong Bishop use the "hold the draw" trainer.
- **Opposition**: taught in the Pawn Endings lesson's Opposition section, rather than as a set of its own.
- **Games to memorize** (2026-11-26): every game on `/games` opens like an
  opening, with Watch, Learn, Review and Test, both sides played. The 1972
  match (20 games; game 2 was a forfeit) and the finished 2026 games are in.
  Every game's PGN is now tested, and so are the comments in `.pgn` files.
- **Flow is now Watch** (2026-11-26), for openings and games.
- **A repertoire tree, with transpositions** (2026-11-26): Explore shows the
  repertoire as a tree beside the board, a row for each stretch between
  branches, with a dot for how much is learned. A line that transposes into
  another stops there with ⇄ and the move order it joins, in the tree and in
  Learn, Review and Watch. In your repertoires that's the London's
  2.Nf3 Nf6 3.Bf4 Qb6 and the Slav's 3.Nf3 Nf6 4.Nc3.
