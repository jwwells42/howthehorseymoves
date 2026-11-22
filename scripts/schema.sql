-- The one table behind "Lichess login" (see src/lib/server/db.ts).
--
-- Run once, by hand, in the Neon SQL editor (Neon console → your project →
-- SQL Editor → paste this → Run), or from this computer with
-- `node --env-file=.env scripts/apply-schema.mjs` (.env holds DATABASE_URL).
-- There is no migration tooling; if this ever changes, the change goes in
-- this file and gets run the same way.
--
-- `progress` is the student's progress as one JSON document: the same
-- entries the browser keeps in localStorage, merged by src/lib/sync/merge.ts.
-- `version` goes up on every write, so two writes at once can't undo each
-- other.

create table if not exists horsey_users (
  id         text        primary key,                 -- Lichess user id, lowercased
  username   text        not null,                    -- as Lichess shows it
  progress   jsonb       not null default '{}'::jsonb,
  version    integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),      -- last progress write
  seen_at    timestamptz not null default now()       -- last sign-in
);

-- The games library (/library): the students' games, which only the teacher
-- (TEACHER_LICHESS_IDS) can see. One row per game. `summary` is what the list
-- and its filters need (src/lib/library/summary.ts), small enough to send all
-- of it at once; `body` is the game's PGN, sent only when the game is opened.
-- `key` is a hash of the players, date, time, event and moves, so importing
-- the same export again adds only the games that are new.

create table if not exists horsey_library (
  id         text        primary key,                 -- random, in the URL
  key        text        not null unique,             -- same game = same key
  summary    jsonb       not null,
  body       text        not null,                    -- the game's PGN
  analysis   jsonb,                                   -- the mistake check, once it has run
  version    integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
