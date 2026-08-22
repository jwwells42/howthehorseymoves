# Bot personality — ideas for the next pass

Parking lot for the bot ladder. Nothing here is built. The ladder that shipped
(see the Bot System section of `CLAUDE.md`) tunes bots by **strength** —
`slack`, `depth`, the mate-scan, the opening book. That gets the difficulty
curve right but leaves every bot feeling like the same opponent playing better
or worse.

The idea worth chasing: make each bot distinctive by **how it plays and how it
behaves**, not just how well.

## The bug that started this

The Sloth answers instantly. A sloth should be the slowest thing on the board.
Right now thinking time is a flat 400 ms for every rung
(`use-game.svelte.ts:188`), so the fastest-computing bot and the slowest-computing
bot feel identical to wait for, and neither matches its animal.

## 1. Per-bot thinking time

Add `thinkMs` to `BotSpec` and let `makeBotMove` use it instead of the hardcoded
400. A range (`[min, max]`, picked randomly) reads more alive than a constant.

| Bot | Feel | Rough `thinkMs` |
|---|---|---|
| Sloth | Dozy. Takes forever, plays a random move anyway | 2500–4000 |
| Chick | Impulsive, pecks at the first shiny thing | 150–350 |
| Frog | Sits still, then hops suddenly | 800–1600 |
| Rabbit | Quick and twitchy | 250–500 |
| Panda | Calm, unhurried, deliberate | 1200–2000 |
| Monkey | Erratic — sometimes instant, sometimes ages | 200–2500 |
| Bear | Heavy and methodical | 1500–2500 |
| Owl | Instant while in book ("I know this one"), long once out | 150 in book / 2000+ out |

The Owl one is nearly free and the most characterful: it already answers from
book instantly. Pair it with a book-specific speech line.

**Constraint:** the search is synchronous on the UI thread, so real compute time
freezes the avatar animation and speech bubble. `thinkMs` must be an *artificial*
delay with the thread free — that's what makes it read as thinking rather than
hanging. Don't buy thinking time by making the search slower.

## 2. Playstyle constraints — the bigger idea

A filter applied to the legal move list before scoring. This is what would make
bots genuinely memorable, and each constraint teaches something specific.

Sketch: `moveFilter?: (board, color, moves) => Move[]` on `BotSpec`, applied in
`pickBotMove` before dispatching to the search.

| Bot | Constraint | What the student learns |
|---|---|---|
| Sloth | Only moves one square at a time (no long slides, no knight leaps) | Long-range pieces are powerful; a slow opponent can't defend across the board |
| Chick | Must capture if a capture exists | Bait it — offer something poisoned |
| Frog | Prefers knights, and pawn double-pushes — things that "hop" | Knights move differently from everything else |
| Rabbit | Always runs an attacked piece away if it can | Forks — it can only run one way |
| Monkey | Prefers checks and captures even when quiet moves are better | Not every check is a good move |
| Bear | Never retreats — pieces only move forward or sideways | Overextension; retreat is a resource |
| Owl | (none — it's the pure test) | — |

**Hard requirement:** a filter must never return an empty list. Always fall back
to the unfiltered moves, or the bot has no move and the game state breaks
(`use-game.svelte.ts:190` currently leaves `waitingForBot` stuck true if
`pickBotMove` returns null).

**Also:** a constraint changes strength, not just flavor. The Sloth restricted to
one-square moves can't develop at all, and the two weakest rungs already draw a
lot by hitting the 300-ply cap in self-play. Re-run
`scripts/bot-ladder-match.ts` after adding any constraint and confirm the ladder
is still monotone.

## 3. Smaller things

- **Reaction lines tied to the constraint.** The Chick complaining when there's
  nothing to eat; the Bear refusing to retreat out loud. Reactions currently only
  fire on captures, checks, and game end — a "stuck" or "annoyed" pool would add
  a lot for very little code.
- **Per-bot board accent.** Each character already has a `color` used for its
  name and pips; tinting something small on the board during that bot's game
  would make the opponent feel present.
- **Show the trophy count somewhere central**, e.g. "5 of 8 bosses beaten" on the
  landing page. The data is already in localStorage (`bot-beaten-{level}`).

## 4. Known limitations worth fixing if the engine gets another pass

- `applySimpleMove` (`bot.ts`) drops castling rights and the en passant square,
  so **castling is invisible to the minimax search** below the root. The bots
  effectively never plan to castle; they only stumble into it at the root.
- There is no endgame king piece-square table — only the midgame one — so the
  minimax bots keep their king in the corner in king-and-pawn endings, which is
  exactly wrong.
- No quiescence search. Depth 3 was measured and is fine (it lifted the Owl from
  63% to 85% against the Bear), but anything deeper without quiescence is a
  gamble, and past depth 3 the search needs a Web Worker regardless.
