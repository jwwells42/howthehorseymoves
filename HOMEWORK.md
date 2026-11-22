# Homework: Positions & PGNs Needed

## Model Games Taken Out (3)

Their PGNs wouldn't play, so they were removed from `src/lib/games/index.ts`. To bring one back, add it with a PGN you've checked:

1. **Morphy vs Le Carpentier, New Orleans 1849.** The plan said smothered mate, but the PGN ended Qd7#, so it might have been the wrong game entirely. It failed at 15...Kc7, with Black's own pawn on c7.

2. **Short vs Timman, Tilburg 1991.** The famous king walk game. It failed at 31.Kh1, because the bishop on e4 controls h1 down the empty f3–g2 diagonal.

3. **Kasparov vs Topalov, Wijk aan Zee 1999.** It failed at 19.Qa2, because White's own pawn on b2 blocks the queen.

## New Model Games to Add (4)

Add to `src/lib/games/index.ts` with correct PGN:

4. **Lasker vs Thomas, London 1912** — 18 moves. The king is dragged by force from g8 to g1, and every sacrifice is check. The most visual king hunt ever.

5. **Réti vs Tartakower, Vienna 1910** — 11 moves. A queen sacrifice on d8, then a double check, and the bishop mates on d8. A real game, not a trap.

6. **Anderssen vs Dufresne, Berlin 1852** — "The Evergreen Game." ~24 moves. Anderssen's other famous sacrificial attack.

7. **Blackburne Shilling Gambit trap** — ~8 moves. 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! — if White falls for it, quick mate. Good trap to know.

## Endings Still Without a Set

- **Zugzwang** — 2-3 simple positions where the side to move loses. Goal: find the move that creates zugzwang.

## Done

- **Greco Mate** and **Greco Greek Gift**: their PGNs were fixed and both now play to the end.
- **Lucena, Philidor, Réti, Wrong Bishop, Pawn Races**: each is an endings set on `/endings` and on the path. Philidor and Wrong Bishop use the "hold the draw" trainer.
- **Opposition**: taught in the Pawn Endings lesson's Opposition section, rather than as a set of its own.
