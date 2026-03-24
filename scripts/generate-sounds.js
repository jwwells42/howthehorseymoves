#!/usr/bin/env node

// Generate small WAV sound files for the chess trainer.
// Run: node scripts/generate-sounds.js

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'static', 'sounds');
mkdirSync(outDir, { recursive: true });

const SAMPLE_RATE = 44100;

function makeWav(samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2; // 16-bit mono
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }

  return buffer;
}

function sine(freq, duration, volume = 0.5) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // Envelope: quick attack, exponential decay
    const env = Math.exp(-t * 8 / duration);
    out[i] = Math.sin(2 * Math.PI * freq * t) * volume * env;
  }
  return out;
}

function noise(duration, volume = 0.3) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 15 / duration);
    out[i] = (Math.random() * 2 - 1) * volume * env;
  }
  return out;
}

function mix(...arrays) {
  const maxLen = Math.max(...arrays.map(a => a.length));
  const out = new Float64Array(maxLen);
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      out[i] += arr[i];
    }
  }
  return out;
}

function offset(samples, delaySec) {
  const padLen = Math.floor(SAMPLE_RATE * delaySec);
  const out = new Float64Array(padLen + samples.length);
  out.set(samples, padLen);
  return out;
}

// Move: wood tap — short noise burst + mid-freq ping
const moveSound = mix(
  noise(0.06, 0.4),
  sine(800, 0.05, 0.3),
  sine(400, 0.04, 0.15),
);

// Correct: bright ascending two-note chime (C5 → E5)
const correctSound = mix(
  sine(523, 0.15, 0.45),
  offset(sine(659, 0.2, 0.45), 0.1),
);

// Wrong: low dull tone
const wrongSound = mix(
  sine(180, 0.25, 0.35),
  sine(220, 0.2, 0.15),
);

// Stars: ascending C5 → E5 → G5 fanfare
const starsSound = mix(
  sine(523, 0.2, 0.4),
  offset(sine(659, 0.2, 0.4), 0.15),
  offset(sine(784, 0.35, 0.5), 0.3),
);

const sounds = {
  move: moveSound,
  correct: correctSound,
  wrong: wrongSound,
  stars: starsSound,
};

for (const [name, samples] of Object.entries(sounds)) {
  const wav = makeWav(samples);
  const path = join(outDir, `${name}.wav`);
  writeFileSync(path, wav);
  const kb = (wav.length / 1024).toFixed(1);
  console.log(`${name}.wav: ${kb} KB (${(samples.length / SAMPLE_RATE * 1000).toFixed(0)}ms)`);
}

console.log(`\nFiles written to ${outDir}`);
