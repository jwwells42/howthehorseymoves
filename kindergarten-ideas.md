# Kindergarten: remembering how the pieces move — ideas for later

Parking lot. Only **Match the Moves** (`/learn/match-moves`, the Level 1 stop after
the six pieces) is built. Everything below is an idea from the same brainstorm.

## The problem that started this

Kindergarteners finish the route puzzles but don't remember which piece moves where.
Two reasons, both in the code:

- **The board does the knowing.** In a route puzzle, tapping the piece puts a dot on every
  square it can reach (`createRouteState` → `validMoves` in `use-puzzle.svelte.ts`), and a tap
  on a square it can't reach is silently ignored. A student can finish by tapping the dot
  nearest the star.
- **Each piece is practised in a block** (15 rook puzzles, then 15 bishop…), so nothing asks a
  student to tell the pieces apart, which is exactly the thing they mix up.

Evidence behind the ideas (mostly from older children and adults):

- Recalling beats being shown (testing effect, Roediger & Karpicke 2006).
- Help that's always there becomes a crutch (guidance hypothesis, Salmoni, Schmidt & Walter 1984).
- Mixing similar things teaches the differences (interleaving, Kornell & Bjork 2008).
- Practice spread over days beats one long go (spacing, Cepeda et al. 2006).

## Fix the dots in the route puzzles

1. Show the dots on the first 2–3 puzzles for each piece, then hide them.
2. A wrong tap shakes the piece, shows a coral ✗, and briefly flashes the piece's moves.
3. A 👁 peek button that brings the dots back for one move but costs a star.
4. Guess first: tap where you think the piece can go, then the dots show whether you were right.

## More multiple choice (no reading needed)

5. **Who moves like this?** The reverse of Match the Moves: one board of arrows, and the
   answers are piece pictures.
6. **Right or wrong?** One board and some arrows, then ✓ or ✗. Fast, so it works against a timer.
7. **Odd one out:** four knight boards, one of them wrong.
8. **Memory pairs:** flip cards to match each piece with its arrows.
9. **Mystery piece:** a "?" moves twice and leaves a trail. Which piece is it?
10. **Harder wrong answers:** later questions use the pieces kids confuse (rook vs queen,
    king vs knight) as the wrong boards.

## A shape for each piece, used everywhere

11. Rook ✚, bishop ✕, queen ✱, king = a small box, knight = an 8-point flower, pawn = one step
    up with two diagonal bites. The same picture on the piece cards, as the hint, after a wrong
    tap.
12. A sound for each piece (Web Audio, like `sound.ts`): rook whoosh, knight boing, king tick.

## Remembering moves on a real board

13. More "tap every square" (`find-moves`) puzzles, mixed in among the routes rather than one
    at the end of each set.
14. **Who can reach the star?** Several pieces and one star; tap the piece that gets there.
15. **Snack time:** some cookies around a piece; tap every cookie it can eat in one move.
16. **Hide and seek:** put the bunny where the enemy bishop can't see it.
17. Two-piece routes: a rook and a bishop, and only the right one gets through.

## Mixing pieces and coming back later

18. A **Mixed Pieces** stop where the piece changes every puzzle.
19. A **Warm-up** button on the home page: 5 quick questions about pieces already learned.

## Mini-games: play, not drills

20. Steps-Method-style mini-games against a bot: a rook catches 3 pawns before one becomes a
    queen, a knight against pawns, the pawn game. `ConversionPuzzle` would need a
    "capture all" goal.

## Read-aloud and teacher tools

21. Read the instructions aloud: the browser's `speechSynthesis` with on-device voices only
    (some Chrome voices send the text to Google), or short clips the teacher records into `static/`.
22. Class mode for the projector: a big board, "where can it go?", and tap to reveal.
23. Printable "draw the moves" worksheets.
24. Moves for the body, done off-screen: arms straight for the rook, crossed for the bishop,
    hop and turn for the knight.
