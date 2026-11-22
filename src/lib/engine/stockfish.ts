/**
 * Stockfish in the browser: Stockfish.js (nmrugg, GPL-3.0), the lite
 * single-threaded build, served from static/engine/ by the site itself. It
 * needs no cross-origin isolation and makes no network calls, so it works on
 * any network that reaches the site.
 *
 * One Engine = one Web Worker = one search at a time. Asking for a new search
 * while one runs stops the old one first (UCI needs its `bestmove` before the
 * next `go`). Call quit() when done; a worker left running keeps a Chromebook busy.
 */

import type { PieceColor } from '$lib/logic/types';
import { readInfo, type EngineLine } from './uci';

export const ENGINE_URL = '/engine/stockfish-19-lite-single.js';

export interface SearchLimits {
  depth?: number;
  nodes?: number;
  movetime?: number;
  /** How many best lines to report (1 = just the best). */
  lines?: number;
}

export interface SearchResult {
  bestmove: string | null;
  /** By rank: [0] = the best line. */
  lines: EngineLine[];
}

interface Search {
  fen: string;
  color: PieceColor;
  limits: SearchLimits;
  onInfo?: (lines: EngineLine[]) => void;
  resolve: (r: SearchResult) => void;
  lines: EngineLine[];
}

export class Engine {
  private worker: Worker;
  private ready: Promise<void>;
  private markReady!: () => void;
  private running: Search | null = null;
  private waiting: Search | null = null;
  private multipv = 1;

  constructor(url: string = ENGINE_URL) {
    this.worker = new Worker(url);
    this.ready = new Promise((resolve) => (this.markReady = resolve));
    this.worker.onmessage = (e: MessageEvent) => this.onLine(String(e.data));
    this.send('uci');
    this.send('isready');
  }

  /**
   * Search a position. `color` is the side to move (scores come back from
   * White's side). `onInfo` gets the lines so far as the search deepens.
   * A search replaced by a newer one resolves with what it had.
   */
  analyse(fen: string, color: PieceColor, limits: SearchLimits, onInfo?: (lines: EngineLine[]) => void): Promise<SearchResult> {
    return new Promise((resolve) => {
      const search: Search = { fen, color, limits, onInfo, resolve, lines: [] };
      if (this.waiting) this.waiting.resolve({ bestmove: null, lines: [] });
      this.waiting = search;
      if (this.running) this.send('stop');
      else void this.startNext();
    });
  }

  /** Stop the current search (it resolves with what it found so far). */
  stop() {
    if (this.waiting) {
      this.waiting.resolve({ bestmove: null, lines: [] });
      this.waiting = null;
    }
    if (this.running) this.send('stop');
  }

  quit() {
    this.stop();
    this.worker.terminate();
  }

  private async startNext() {
    await this.ready;
    const search = this.waiting;
    if (!search || this.running) return;
    this.waiting = null;
    this.running = search;
    const lines = Math.max(1, search.limits.lines ?? 1);
    if (lines !== this.multipv) {
      this.setOption('MultiPV', lines);
      this.multipv = lines;
    }
    this.send(`position fen ${search.fen}`);
    const { depth, nodes, movetime } = search.limits;
    const go = ['go'];
    if (depth) go.push(`depth ${depth}`);
    if (nodes) go.push(`nodes ${nodes}`);
    if (movetime) go.push(`movetime ${movetime}`);
    if (go.length === 1) go.push('depth 18');
    this.send(go.join(' '));
  }

  private onLine(line: string) {
    if (line === 'readyok') {
      this.markReady();
      return;
    }
    const search = this.running;
    if (!search) return;
    if (line.startsWith('info ')) {
      const info = readInfo(line, search.color);
      if (!info) return;
      search.lines[info.rank - 1] = info;
      // Only report once the best line is in (MultiPV reports rank 1 first at each depth)
      if (search.lines[0]) search.onInfo?.(search.lines.filter(Boolean));
    } else if (line.startsWith('bestmove')) {
      const move = line.split(/\s+/)[1];
      this.running = null;
      search.resolve({ bestmove: move && move !== '(none)' ? move : null, lines: search.lines.filter(Boolean) });
      if (this.waiting) void this.startNext();
    }
  }

  private setOption(name: string, value: string | number) {
    this.send(`setoption name ${name} value ${value}`);
  }

  private send(command: string) {
    this.worker.postMessage(command);
  }
}
