# Homework: Positions & PGNs Needed

## Broken Model Game PGNs (5)

Replace the `pgn` field in `src/lib/games/index.ts` for each:

1. **`greco-mate`** — Gioacchino Greco manuscript, 1620. Giuoco Piano, Bc4/Qb3 f7 attack, king hunt. Current PGN fails at 17...Kg8 (Be6 controls g8).

2. **`greco-greek-gift`** — Another Greco manuscript, 1620. Same opening as above (diverges at move 8). Current PGN fails at 20.Qb3 (queen can't reach b3 from e2).

3. **`morphy-lecarpentier`** — Morphy vs Alonzo Morphy/Le Carpentier, New Orleans 1849. Plan says smothered mate but PGN ends Qd7#. Fails at 15...Kc7 (own pawn on c7). Might be the wrong game entirely.

4. **`short-king-walk`** — Short vs Timman, Tilburg 1991. The famous king walk game. Current PGN fails at 31.Kh1 (Be4 controls h1 via empty f3-g2 diagonal).

5. **`kasparov-immortal`** — Kasparov vs Topalov, Wijk aan Zee 1999. Current PGN fails at 19.Qa2 (own pawn on b2 blocks queen).

## New Model Games to Add (5)

Add to `src/lib/games/index.ts` with correct PGN:

6. **Lasker vs Thomas, London 1912** — 18 moves. King dragged by force from g8 to h1, every sacrifice is check. The most visual king hunt ever.

7. **Réti vs Tartakower, Vienna 1910** — ~11 moves. Smothered mate in a real game (not a trap). Companion to the Budapest smothered mate trap already in the list.

8. **Anderssen vs Dufresne, Berlin 1852** — "The Evergreen Game." ~24 moves. Anderssen's other famous sacrificial attack.

9. **Blackburne Shilling Gambit trap** — ~8 moves. 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! — if White falls for it, quick mate. Good trap to know.

10. **Réti endgame study** — Not a game but THE example of king geometry. King chases two pawns simultaneously. Could be a special "famous position" entry. (Also add to Advanced Endings as a trainer — see below.)

## Advanced Endings — FENs Needed

These are `comingSoon: true` in `src/lib/puzzles/index.ts` under `advanced-endings`. Each needs a FEN position and solution approach:

- **Lucena Position** (`endings-lucena`) — Standard "build a bridge" setup. Rook + pawn on 7th vs rook. White to play and win.

- **Philidor Position** (`endings-philidor`) — Standard defensive setup. Rook on 6th rank holds the draw. **Needs "hold the draw" mode** (new component — see design discussion).

- **Opposition** (`endings-opposition`) — 3-4 K+P vs K positions demonstrating direct and distant opposition. Goal: promote the pawn.

- **Zugzwang** (`endings-zugzwang`) — 2-3 simple positions where the side to move loses. Goal: find the move that creates zugzwang.

- **Réti Study** (`endings-reti`) — The specific famous position. King geometry allows reaching two pawns.

- **Wrong Bishop** (`endings-wrong-bishop`) — Rook pawn + wrong-color bishop = draw. **Needs "hold the draw" mode** or lesson-style walkthrough.

- **Pawn Races** (`endings-pawn-races`) — Positions where students count tempi to decide who promotes first.
