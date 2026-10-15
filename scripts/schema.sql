-- The one table behind "Lichess login" (see src/lib/server/db.ts).
--
-- Run once, by hand, in the Neon SQL editor (Neon console → your project →
-- SQL Editor → paste this → Run). There is no migration tooling; if this
-- ever changes, the change goes in this file and gets run the same way.
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
