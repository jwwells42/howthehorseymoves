import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

/*
  Every sentence on the site is one the teacher wrote or approved. Anything
  that reads like a sentence (four or more words, or two or more ending in
  . ! or ?) has to be listed, word for word, in src/words.txt, which only the
  teacher edits. A sentence that isn't there fails this test.

  Names and labels of three words or fewer ("Rook", "Back to home") aren't
  checked. Neither is chess notation, nor the pages listed in NOT_CHECKED.
*/

const SRC = 'src';
const WORDS = join(SRC, 'words.txt');

/** Pages left as they are for now. */
const NOT_CHECKED = [
  'src/routes/about/',
  'src/routes/breathwork/',
  'src/routes/probabilitizer/',
  'src/routes/lichess-eval-diffs/',
  'src/lib/breathwork/',
  'src/lib/components/breathwork/',
  'src/lib/probabilitizer/',
  'src/lib/eval-diffs-data.ts'
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(svelte|ts)$/.test(name) && !name.includes('.test.') ? [path] : [];
  });
}

const files = sourceFiles(SRC).filter((path) => !NOT_CHECKED.some((skip) => path.startsWith(skip)));

/** Code comments and styles aren't on the page. */
function withoutComments(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/\s.*$/gm, '');
}

/** String literals in code: '…', "…" and `…` (which can run over several lines), with ${…} shown as … */
function literals(code: string, quotes = `'"\``): string[] {
  const kinds = [...quotes].map((q) => (q === '`' ? '`((?:\\\\.|[^\\\\`])*)`' : `${q}((?:\\\\.|[^\\\\${q}\\n])*)${q}`));
  return [...code.matchAll(new RegExp(kinds.join('|'), 'g'))].map((m) =>
    m.slice(1).find((body) => body !== undefined)!.replace(/\$\{[^}]*\}/g, '…')
  );
}

/** What a reader could see in a file: text, labels, and the strings in its code. */
function strings(path: string): string[] {
  const text = withoutComments(readFileSync(path, 'utf8'));
  if (path.endsWith('.ts')) return [...literals(text), ...pgnComments(text)];

  const scripts = [...text.matchAll(/<script[\s\S]*?<\/script>/g)].map(([s]) => s).join('\n');
  const markup = text.replace(/<script[\s\S]*?<\/script>/g, '');
  const expressions = [...markup.matchAll(/\{([^{}]*)\}/g)].map(([, e]) => e).join('\n');
  return [
    ...[...markup.matchAll(/>([^<>]+)</g)].map(([, t]) => t.replace(/\{[^{}]*\}/g, '…')),
    ...[...markup.matchAll(/\b(?:title|label|aria-label|placeholder|alt|reason)="([^"]*)"/g)].map(([, t]) =>
      t.replace(/\{[^{}]*\}/g, '…')
    ),
    ...literals(scripts),
    ...pgnComments(scripts),
    ...literals(expressions, `'\``)
  ];
}

/** The words in a PGN's {comments}, which the game viewer shows. */
function pgnComments(code: string): string[] {
  return literals(code)
    .filter((s) => /\d\.\s*[KQRBNa-hO]/.test(s))
    .flatMap((pgn) => [...pgn.matchAll(/\{([^{}]*)\}/g)].map(([, c]) => c.replace(/\[%[^\]]*\]/g, '')));
}

const decode = (s: string) =>
  s
    .replace(/&mdash;/g, '—')
    .replace(/&rarr;/g, '→')
    .replace(/&apos;/g, "'")
    .replace(/&le;/g, '≤')
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/\\u2019/g, '’')
    .replace(/\\u2014/g, '—')
    .replace(/\\(['"`])/g, '$1');

/** Reads like a sentence: four or more words, or two or more ending in . ! ? */
function isSentence(s: string): boolean {
  if (/[;=<>{}|_]|\/|--|\d\.\s*[KQRBNa-hO]/.test(s.replace(/\s\/\s/g, ' '))) return false; // code, a path, a FEN or a PGN
  const words = s.split(/\s+/).filter((w) => /[A-Za-z]{2}/.test(w));
  const notation = words.filter((w) => /^[KQRBN]?[a-h]?x?[a-h][1-8]\W*$/.test(w)).length;
  if (notation >= 2) return false;
  return words.length >= 4 || (words.length >= 2 && /[.!?]$/.test(s));
}

const found = files.flatMap((path) =>
  strings(path)
    .map((s) => decode(s).replace(/\s+/g, ' ').trim())
    .filter(isSentence)
    .map((text) => ({ path: relative('.', path), text }))
);

const approved = new Set(
  readFileSync(WORDS, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
);

describe('words on the site', () => {
  it('every sentence is in src/words.txt', () => {
    const missing = found.filter(({ text }) => !approved.has(text)).map(({ path, text }) => `${path}: ${text}`);
    expect([...new Set(missing)]).toEqual([]);
  });
});
