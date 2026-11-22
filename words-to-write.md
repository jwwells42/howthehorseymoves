# Words to write

Every place on the site that had AI-written words and might want your words
instead. Nothing here shows on the site until you write it.

**How to fill it in:** write after the colon. For a bot, separate several lines
with ` / ` and one is picked at random each time. Leave a slot blank and that
spot stays empty. Then tell Claude it's filled in, and it copies your words into
the code exactly as written, and into `src/words.txt` (the list `npm test`
checks every sentence on the site against).

If you'd rather type straight into the code, the file is named in each section.
Add any sentence you write there to `src/words.txt` too, or `npm test` fails.

---

## 1. Bot speech bubbles

File: `src/lib/characters/bots.ts`, each bot's `reactions`.

Right now every bot reacts with its animation only. A bubble is about 12rem
wide, so roughly 20 letters to a line. Students who can't read get the
animation either way.

The moments, and what the bot's picture does at each:

- **greeting**: a new game starts
- **thinking**: while it picks its move (rocks side to side)
- **move**: after an ordinary move of its own (tilts)
- **capture**: it takes one of your pieces (bounces)
- **check**: it puts your king in check (jumps)
- **captured**: you take one of its pieces (shakes)
- **checkmate**: it checkmates you (celebrates)
- **checkmated**: you checkmate it (droops)
- **draw**: the game is a draw
- **resign**: you resign. The code has a note asking these to be kind and never gloating

### The Sloth: Level 1 boss (plays any legal move at random)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Chick: Level 2 boss (grabs the biggest capture it can, never checks if it's safe)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Pig: Level 3 boss (picks among moves that look good, often a poor one; sometimes leaves a knight to be taken; doesn't see mate in 1 coming)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Frog: Level 4 boss (picks among good moves, often not the best; doesn't see mate in 1 coming)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Duck: Level 5 boss (like the Frog but picks better; still doesn't see mate in 1 coming)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Rabbit: Level 6 boss (picks among good moves, not always the best; stops mate in 1)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Penguin: Level 7 boss (plays its best one-move answer, but doesn't see mate in 1 coming)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Panda: Level 8 boss (plays its best one-move answer; takes what you leave, spots mate in 1)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Goat: Level 9 boss (looks two moves ahead, often not for the best)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Monkey: Level 10 boss (looks two moves ahead, but not always for the best)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Gorilla: Level 11 boss (looks two moves ahead, nearly always plays the best it finds)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Bear: Level 12 boss (looks two moves ahead, plays the best it finds)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Elephant: Level 13 boss (looks three moves ahead, not always for the best; knows some openings by heart)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

### The Owl: Level 14 boss (looks three moves ahead, knows some openings by heart)

- greeting:
- thinking:
- move:
- capture:
- check:
- captured:
- checkmate:
- checkmated:
- draw:
- resign:

---

## 3. To do: review the privacy page and the About page

Files: `src/routes/privacy/+page.svelte` (the page at `/privacy`) and the two
privacy sections of `src/routes/about/+page.svelte` ("Privacy & Student
Safety", "For Administrators").

Claude wrote these on 2026-11-21 at your request, from the research in
`PRIVACY.md`, because the About page still said "no accounts" and "no
server-side data storage" after the Lichess login went live. They are not your
words yet, so `npm test` skips the privacy page until you've been through it.

Check, and change anything you like:

- [ ] Every statement is true, and reads the way you'd say it to a parent or
      an administrator
- [ ] Your name or your school's, if you want either on it (it says "the
      teacher" now)
- [ ] A contact a parent can use: it only points to the GitHub page now. An
      email address or a school contact?
- [ ] "it will be deleted promptly": a number of days instead?
- [ ] How long accounts and games are kept (it says "until it is deleted"
      now). For example: accounts not used for a year, or every summer. Tell
      Claude and it can be automated
- [ ] The district's answers (see `PRIVACY.md`, open items 2 and 3) before
      students log in with a class; the page says students under 13 log in
      only with the school's consent

When you're done, tell Claude: it adds the page's sentences to
`src/words.txt` as your words and takes the page off the words test's skip
list.

---

## 2. Optional: how-to-play lines for the Vision trainers

Files: `src/lib/components/blindfold/`, one per trainer.

Each trainer's start screen had a short paragraph explaining the game. They're
gone, so the start screen is now the name, the best score and Start. These are
for students who read. Write one only where you think it's needed.

- Color of Square:
- Same Diagonal?:
- Knight Squares:
- Neighbor Squares:
- Move Counting:
- Relative Position:
- Piece Reachability:
- Piece Count:
- Flash Position:
- What Changed? (it also said to type the square a piece moved to *or* from):
- Where Did It Land?:
- Who's Guarding Whom?:
- Blind Tactics (it also explained the "Delay moves" setting):
- Blindfold Puzzles:
- Blindfold Mate, all five (it also gave the move format, e.g. Qd2):
- Knight Routes:
- Bishop Routes (it also said to press Can't reach! when there's no route):
- Rook Maze:
- Knight Gauntlet (it also said: don't land on a square the queen attacks):
