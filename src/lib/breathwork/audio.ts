// Soothing breath drone — a sustained two-tone synth for the breathwork pacer.
//
// Unlike the game blips in sound.ts (fast exponential-decay envelopes), this is
// a continuous drone: one steady warm tone while inhaling, one lower settling
// tone while exhaling, gently crossfaded at each phase boundary so there are no
// clicks and no within-phase pitch sweep. Reuses the shared AudioContext from
// sound.ts and respects the global mute store.

import { getCtx } from '$lib/state/sound';
import { soundMuted } from '$lib/state/sound';
import type { BreathPhaseName } from './engine';

let muted = false;
soundMuted.subscribe((v) => {
  muted = v;
});

// Tones, chosen warm and low. Inhale ≈ A3, exhale a fourth below ≈ E3.
const INHALE_HZ = 220;
const EXHALE_HZ = 165;
const PARTIAL_RATIO = 1.5; // a fifth above the fundamental, quietly, for warmth
const MASTER_VOLUME = 0.16;
const CROSSFADE = 0.5; // seconds — gentle tone-to-tone blend
const FADE = 1.0; // seconds — overall fade in/out on start/stop

interface Voice {
  fund: OscillatorNode;
  partial: OscillatorNode;
  gain: GainNode;
}

export class BreathDrone {
  private ctx: AudioContext | null = null;
  private filter: BiquadFilterNode | null = null;
  private master: GainNode | null = null;
  private inhale: Voice | null = null;
  private exhale: Voice | null = null;
  private started = false;

  private makeVoice(ctx: AudioContext, freq: number, dest: AudioNode): Voice {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(dest);

    const fund = ctx.createOscillator();
    fund.type = 'sine';
    fund.frequency.value = freq;
    fund.connect(gain);

    const partial = ctx.createOscillator();
    partial.type = 'sine';
    partial.frequency.value = freq * PARTIAL_RATIO;
    const partialGain = ctx.createGain();
    partialGain.gain.value = 0.3;
    partial.connect(partialGain);
    partialGain.connect(gain);

    fund.start();
    partial.start();
    return { fund, partial, gain };
  }

  /** Begin the drone. Call from a user gesture so the AudioContext can resume. */
  start(): void {
    if (this.started || muted) return;
    try {
      const ctx = getCtx();
      this.ctx = ctx;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.4;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(MASTER_VOLUME, ctx.currentTime + FADE);

      filter.connect(master);
      master.connect(ctx.destination);

      this.filter = filter;
      this.master = master;
      this.inhale = this.makeVoice(ctx, INHALE_HZ, filter);
      this.exhale = this.makeVoice(ctx, EXHALE_HZ, filter);
      this.started = true;
    } catch {
      // AudioContext unavailable — stay silent.
    }
  }

  /** Crossfade to the tone for the given phase. No-op until started. */
  setPhase(phase: BreathPhaseName): void {
    if (!this.started || !this.ctx || !this.inhale || !this.exhale) return;
    const t = this.ctx.currentTime;
    const inhaling = phase !== 'exhale';
    this.inhale.gain.gain.setTargetAtTime(inhaling ? 1 : 0, t, CROSSFADE / 3);
    this.exhale.gain.gain.setTargetAtTime(inhaling ? 0 : 1, t, CROSSFADE / 3);
    if (phase === 'topoff') this.accent();
  }

  /** A brief gentle upward shimmer for the sigh's top-off sip. */
  private accent(): void {
    if (!this.ctx || !this.filter) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = INHALE_HZ * 2; // an octave above the inhale tone
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(t);
    osc.stop(t + 1.1);
  }

  /** Fade out and tear down. Safe to call repeatedly. */
  stop(): void {
    if (!this.started || !this.ctx || !this.master) {
      this.started = false;
      return;
    }
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), t);
    this.master.gain.exponentialRampToValueAtTime(0.0001, t + FADE);

    const voices = [this.inhale, this.exhale].filter((v): v is Voice => v !== null);
    const stopAt = t + FADE + 0.05;
    for (const v of voices) {
      v.fund.stop(stopAt);
      v.partial.stop(stopAt);
    }

    this.started = false;
    this.inhale = null;
    this.exhale = null;
    this.master = null;
    this.filter = null;
    this.ctx = null;
  }
}
