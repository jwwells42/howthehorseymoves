// Runs scripts/schema.sql against the database, from this computer.
// The same as pasting the file into Neon's SQL Editor; safe to run again
// (every statement is "create … if not exists").
//
//   1. Put the database's connection string in a file called .env at the
//      top of the repo (it's gitignored, so it never gets committed):
//        DATABASE_URL=postgresql://…
//      Copy it from Vercel → Settings → Environment Variables → DATABASE_URL.
//   2. node --env-file=.env scripts/apply-schema.mjs

import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ No DATABASE_URL. Put it in .env and run with --env-file=.env');
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

// One statement at a time (the HTTP driver takes one per call), split at a
// semicolon that ends a line, with -- comments taken out first
const statements = schema
  .replace(/--.*$/gm, '')
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
  console.log('✓', statement.split('\n')[0]);
}

const tables = await sql.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
);
console.log('Tables:', tables.map((t) => t.table_name).join(', '));
