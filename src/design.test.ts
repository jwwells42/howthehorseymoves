import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

/*
  Holds the design system in src/app.css to its own rules. The colours are read
  from that file, so a change there is checked here without editing this one.
*/

const SRC = 'src';
const APP_CSS = join(SRC, 'app.css');

const css = readFileSync(APP_CSS, 'utf8');

/** Every `--name: #hex;` in app.css, keyed by name without the dashes. */
const tokens: Record<string, string> = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(([, name, hex]) => [name, hex])
);

function token(name: string): string {
  const hex = tokens[name];
  if (!hex) throw new Error(`app.css has no --${name} set to a six-digit hex colour`);
  return hex;
}

// ---- Colour arithmetic ----------------------------------------------------

type Rgb = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function linearRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as Rgb;
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** WCAG 2 contrast ratio. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(linearRgb(a)), luminance(linearRgb(b))].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Simulated dichromat vision at full severity. Machado, Oliveira and Fernandes,
 * "A Physiologically-based Model for Simulation of Color Vision Deficiency",
 * IEEE TVCG 2009. The matrices apply to linear RGB. Normal vision is the
 * identity.
 */
const VISION: Record<string, number[][]> = {
  normal: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881]
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]
  ]
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));

function simulate(rgb: Rgb, matrix: number[][]): Rgb {
  return matrix.map((row) => clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])) as Rgb;
}

/** Linear sRGB to CIE L*a*b*, D65 white. */
function lab([r, g, b]: Rgb): Rgb {
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIE76 colour difference, as seen by the given kind of vision. */
function difference(a: string, b: string, matrix: number[][]): number {
  const labA = lab(simulate(linearRgb(a), matrix));
  const labB = lab(simulate(linearRgb(b), matrix));
  return Math.hypot(...labA.map((v, i) => v - labB[i]));
}

// ---- The rules -------------------------------------------------------------

/** WCAG AA. Text needs 4.5:1, large or bold text and shapes need 3:1. */
const TEXT = 4.5;
const LARGE = 3;

/** [foreground, background, minimum ratio] */
const CONTRAST_RULES: [string, string, number][] = [
  ...['page', 'surface', 'surface-raised'].map((bg): [string, string, number] => ['ink', bg, TEXT]),
  ...['ink-muted', 'correct-text', 'wrong-text', 'highlight'].flatMap((fg) =>
    ['page', 'surface'].map((bg): [string, string, number] => [fg, bg, TEXT])
  ),
  ...['page', 'surface'].map((bg): [string, string, number] => ['star', bg, LARGE]),
  ['on-action', 'action', TEXT],
  ['on-action', 'action-hover', TEXT],
  ['on-answer', 'correct', TEXT],
  ['on-answer', 'wrong', LARGE],
  ['board-light', 'board-dark', LARGE],
  ['piece-white', 'piece-black', TEXT],
  ...['breath-rest', 'breath-in', 'breath-top', 'breath-out'].map(
    (bg): [string, string, number] => ['breath-ink', bg, TEXT]
  ),
  ...Object.keys(tokens)
    .filter((name) => name.startsWith('bot-'))
    .flatMap((bot) => ['page', 'surface'].map((bg): [string, string, number] => [bot, bg, TEXT]))
];

/**
 * Colours that sit side by side and must never be mistaken for each other.
 * The answers, the highlight and the arrow colours are all drawn on board squares.
 */
const DISTINCT = ['correct', 'wrong', 'highlight', 'mark-other', 'board-light', 'board-dark'];
const DISTINCT_TEXT = ['correct-text', 'wrong-text'];

/**
 * How far apart two colours must stay, as CIE76 ΔE. The old green and red were
 * 9 apart under deuteranopia.
 */
const MIN_DIFFERENCE = 25;

function pairs(names: string[]): [string, string][] {
  return names.flatMap((a, i) => names.slice(i + 1).map((b): [string, string] => [a, b]));
}

describe('contrast', () => {
  it.each(CONTRAST_RULES)('--%s on --%s is at least %s:1', (fg, bg, min) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });
});

describe('colours that carry meaning stay apart', () => {
  for (const [vision, matrix] of Object.entries(VISION)) {
    it.each([...pairs(DISTINCT), ...pairs(DISTINCT_TEXT)])(
      `--%s and --%s, with ${vision} vision`,
      (a, b) => {
        expect(difference(token(a), token(b), matrix)).toBeGreaterThanOrEqual(MIN_DIFFERENCE);
      }
    );
  }
});

// ---- Nothing outside app.css picks its own colour or type ---------------------

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(svelte|ts|js|css)$/.test(name) && !name.includes('.test.') ? [path] : [];
  });
}

const files = sourceFiles(SRC).filter((path) => path !== APP_CSS);

/** Lines of each file that match a pattern, as "path:line: text". */
function offending(pattern: RegExp): string[] {
  return files.flatMap((path) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, i) => (pattern.test(line) ? [`${relative('.', path)}:${i + 1}: ${line.trim()}`] : []))
  );
}

describe('components take their look from app.css', () => {
  it('no colour is written outside app.css', () => {
    // A hex colour (not an HTML entity like &#9733;), or an rgb()/hsl() call.
    const colour = /(?<![&\w])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?)\(/i;
    expect(offending(colour)).toEqual([]);
  });

  it('no typeface is named outside app.css', () => {
    const typeface = /font-family(?!:\s*(?:inherit|var\(--font\)))/;
    expect(offending(typeface)).toEqual([]);
  });

  it('no text is set below --size-small, 14px', () => {
    const tooSmall = files.flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/font-size:\s*([\d.]+)(rem|em|px)/g)]
        .filter(([, value, unit]) => Number(value) * (unit === 'px' ? 1 : 16) < 14)
        .map(([match]) => `${relative('.', path)}: ${match}`)
    );
    expect(tooSmall).toEqual([]);
  });

  it('no weight is written outside app.css', () => {
    // How bold the site looks is --weight-strong. A number or `bold` written
    // in a component would ignore it.
    expect(offending(/font-weight:(?!\s*(?:var\(--weight-|inherit))/)).toEqual([]);
  });

  it('no text is slanted', () => {
    expect(offending(/font-style:\s*(?:italic|oblique)/)).toEqual([]);
  });

  it('every custom property that is read is set somewhere', () => {
    // A misspelt token, like --card for --surface, fails silently in the
    // browser: the rule is dropped and the element goes transparent.
    const sources = [APP_CSS, ...files].map((path) => readFileSync(path, 'utf8'));
    const defined = new Set(sources.flatMap((text) => [...text.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name)));
    const undefinedUses = files.flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/var\((--[\w-]+)/g)]
        .filter(([, name]) => !defined.has(name))
        .map(([, name]) => `${relative('.', path)}: ${name}`)
    );
    expect(undefinedUses).toEqual([]);
  });
});
