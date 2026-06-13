// Breath-loop engine — a small, framework-agnostic pacer driver.
//
// Given a repeating sequence of phases (each with a label and a duration in
// seconds), it advances phase-by-phase using a chained, drift-corrected
// setTimeout. On every phase change it fires `onPhase` so the UI can update the
// orb and the audio can crossfade. An optional total duration ends the session
// with a gentle `onComplete`.

export type BreathPhaseName = 'inhale' | 'topoff' | 'exhale';

export interface BreathPhase {
  name: BreathPhaseName;
  /** Phase length in seconds. */
  seconds: number;
}

export interface BreathEngineOptions {
  /** Phases that repeat in order, e.g. [inhale, exhale] or [inhale, topoff, exhale]. */
  phases: BreathPhase[];
  /** Optional cap on the whole session, in seconds. Omit for open-ended. */
  totalSeconds?: number;
  /** Fired when a new phase begins (including the very first). */
  onPhase: (phase: BreathPhase, index: number) => void;
  /** Fired each time a full cycle completes (after the last phase). */
  onCycle?: (completedCycles: number) => void;
  /** Fired when the total duration elapses (only if totalSeconds is set). */
  onComplete?: () => void;
  /** Fired ~10×/sec with seconds elapsed in the whole session (for a countdown). */
  onTick?: (elapsedSeconds: number) => void;
}

export class BreathEngine {
  private opts: BreathEngineOptions;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private phaseIndex = 0;
  private cycles = 0;
  private startTime = 0;
  private phaseStart = 0;
  private running = false;

  constructor(opts: BreathEngineOptions) {
    this.opts = opts;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.phaseIndex = 0;
    this.cycles = 0;
    this.startTime = performance.now();
    this.ticker = setInterval(() => {
      if (!this.running) return;
      this.opts.onTick?.((performance.now() - this.startTime) / 1000);
    }, 100);
    this.runPhase();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.ticker) clearInterval(this.ticker);
    this.timer = null;
    this.ticker = null;
  }

  private runPhase(): void {
    if (!this.running) return;
    const phase = this.opts.phases[this.phaseIndex];
    this.phaseStart = performance.now();
    this.opts.onPhase(phase, this.phaseIndex);

    // Drift-corrected: aim for an absolute target time rather than chaining raw
    // delays, so accumulated timer slop doesn't slowly desync the pace.
    const target = this.phaseStart + phase.seconds * 1000;

    const advance = () => {
      if (!this.running) return;

      // End the whole session if we've reached the total duration.
      if (this.opts.totalSeconds != null) {
        const elapsed = (performance.now() - this.startTime) / 1000;
        if (elapsed >= this.opts.totalSeconds) {
          this.stop();
          this.opts.onComplete?.();
          return;
        }
      }

      this.phaseIndex += 1;
      if (this.phaseIndex >= this.opts.phases.length) {
        this.phaseIndex = 0;
        this.cycles += 1;
        this.opts.onCycle?.(this.cycles);
      }
      this.runPhase();
    };

    const remaining = Math.max(0, target - performance.now());
    this.timer = setTimeout(advance, remaining);
  }
}
