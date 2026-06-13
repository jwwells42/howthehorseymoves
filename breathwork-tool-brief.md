# Breathwork Trainer — Project Brief

A web tool for performance-coaching students to practice two evidence-based breathing
protocols. Built to be handed to Claude Code as a starting spec.

> **For Claude Code:** The numbers in the "Validated Parameters" sections below are taken
> from the research literature and must be used exactly as written. Do not substitute
> "common knowledge" values. Everything in "Build Notes" and "Suggested Features" is open
> to your judgment.

---

## What we're building

An interactive breathing pacer with two modes:

1. **Resonance Breathing** — slow-paced breathing near the user's resonance frequency,
   with an extended exhale. The foundational training practice + pre-performance primer.
2. **Cyclic Physiological Sigh** — a fast down-regulation tool for acute use and short
   daily practice.

Plus a small **Resonance Frequency (RF) estimator** that suggests a starting rate from
the user's height and sex, and (optionally) a **RF sweep assessment** mode.

Audience: coaching students learning to teach these protocols, and their clients. So the
UI should double as a teaching reference — show *why* each parameter is what it is.

---

## Protocol 1 — Resonance Breathing

### Validated parameters (use exactly)

- **Resonance frequency band:** 4.5–7.0 breaths/min. Population average ≈ 5.5 bpm.
- **Inhale:exhale ratio:** exhale should be **longer** than inhale. Use a ~40% inhale /
  60% exhale split (i.e. I:E ≈ 0.67, often written 4:6). RMSSD (vagal activity marker) is
  higher when exhalation exceeds inhalation; a brief post-phase pause adds nothing, so
  no breath holds.
- **Effects are robust but degrade gradually off-peak** — being half a breath/min off the
  true resonance rate is a minor cost, not a failure.
- **Acute dose for the executive-function/pre-performance benefit:** 10–17 minutes. (The
  cognitive-performance studies used sessions in this range; a 2-minute version calms but
  is not the dose that moved cognition in the research.)

### RF estimation formula (use exactly)

From Hasuo et al. (2024), regression on sex + height. **Height is in centimeters.**
Convert inches → cm by ×2.54.

```
Female:  RF_bpm = 15.88 − 0.06 × height_cm
Male:    RF_bpm = 17.90 − 0.07 × height_cm
```

Clamp the output to the 4.5–7.0 band.

**Important honesty constraints for the UI copy:**
- This is an *estimate*, not a measurement. The female model's adjusted R² was 0.47 and
  the male model's 0.55 — height + sex explain under half the variance. Individuals scatter
  around the estimate.
- The study that produced the formula swept 5.0–7.0 bpm (it did **not** test 4.5), so the
  formula is anchored toward the faster end by design.
- The direction is the reliable part: **shorter and/or female → faster rate; taller and/or
  male → slower rate** (inverse correlation with height ≈ −0.55, driven by blood volume /
  baroreflex loop length).
- If the user can measure HRV, the **sweep assessment beats the formula**. The formula is
  the fallback for when no sensor is available.

### Worked example (use as a test case)

5'2" woman = 62 in = 157.5 cm
`RF = 15.88 − 0.06 × 157.5 = 6.43 bpm`

→ cycle = 60 / 6.43 ≈ 9.3 s
→ inhale = 0.40 × 9.3 ≈ 3.7 s, exhale = 0.60 × 9.3 ≈ 5.6 s
→ display as roughly **3.7 s inhale / 5.6 s exhale**

### Pacer math (general)

```
cycle_seconds = 60 / target_rate_bpm
inhale_seconds = 0.40 × cycle_seconds
exhale_seconds = 0.60 × cycle_seconds
```

Let the user override the ratio and rate manually; the formula just sets defaults.

### Optional: RF sweep assessment mode

Guide the user through 5.0 / 5.5 / 6.0 / 6.5 / 7.0 bpm, a few minutes each, and have them
note which felt smoothest / which produced the largest, easiest oscillation. (Full
objective scoring needs an HRV sensor and a low-frequency-power readout — out of scope for
v1 unless you wire in a Bluetooth HR input later.)

---

## Protocol 2 — Cyclic Physiological Sigh

### Validated parameters (use exactly)

- **One cycle = double inhale through the nose, then a long slow exhale through the mouth.**
  - Inhale 1: through nose to ~80–90% full (~2 s)
  - Inhale 2: short sharp top-off sip through nose to fully inflate (~1 s) — *do not omit;
    this second inhale is the mechanistically important part (reinflates collapsed alveoli)*
  - Exhale: slow, unforced, through the mouth until comfortably empty (~5–8 s)
  - No breath holds, no forced effort. Ratio ≈ 1:2 inhale:exhale.
- **Acute reset dose:** 1–3 cycles (~30 s) to shift state quickly.
- **Daily practice dose:** 5 minutes continuous. This is the dose that, in the trial,
  produced significant mood improvement and reduced physiological arousal, with cumulative
  benefit over ~28 days — and outperformed box breathing, cyclic hyperventilation, and
  mindfulness on mood and respiratory-rate reduction.

### Build note
Give a soften-the-second-inhale escape hatch: a minority of users feel lightheaded if
they're already over-breathing. UI tip should say to ease the top-off inhale and lengthen
the exhale if that happens.

---

## Suggested features (your judgment)

- Animated pacer (expanding/contracting circle or rising/falling bar) driven by the
  inhale/exhale seconds. Distinct visual states for inhale / second-inhale / exhale.
- Mode switch: Resonance ↔ Physiological Sigh.
- RF estimator: height (in or cm toggle) + sex → suggested rate → auto-filled pacer, with
  the "this is an estimate" note visible.
- Manual override of rate and I:E ratio.
- Session timer with presets (e.g. 5 min sigh, 10–17 min resonance) and a gentle end cue.
- Optional sound/haptic cue on phase change; mute by default.
- A short "why this works" panel per protocol for the teaching-reference angle.

### Stack suggestion
Single-page, no backend needed for v1 — plain HTML/CSS/JS or a small React app. Animation
via CSS transitions or requestAnimationFrame keyed to the phase durations. (Your Claude
Code environment has a frontend-design skill worth reading before styling.)

### Out of scope for v1
Live HRV/Bluetooth integration, accounts, data storage.

---

## Safety / disclaimer copy to include

- General wellness/education tool, not medical advice or treatment.
- Stop if dizzy, lightheaded, or experiencing chest pain; sit down.
- Don't practice while driving or in/near water.
- The physiological sigh's double-inhale: soften it if it causes lightheadedness.
- Anyone with a cardiac, respiratory, or anxiety condition (or who is pregnant) should
  check with a clinician before regular practice.

---

## References

- Balban MY, Neri E, Kogon MM, et al. (2023). *Brief structured respiration practices
  enhance mood and reduce physiological arousal.* Cell Reports Medicine 4(1):100895.
  — cyclic sighing protocol & comparative effects.
- Hasuo H, Mori K, Matsuoka H, Sakuma H, Ishikawa H. (2024). *An Estimation Formula for
  Resonance Frequency Using Sex and Height for Healthy Individuals and Patients with
  Incurable Cancers.* Applied Psychophysiology and Biofeedback 49:125–132.
  — the height/sex RF formula.
- Vaschillo EG, Vaschillo B, Lehrer PM. (2006). *Characteristics of Resonance in Heart
  Rate Variability Stimulated by Biofeedback.* Applied Psychophysiology and Biofeedback
  31(2):129–142. — height↔RF inverse relationship, blood-volume mechanism.
- Laborde S, Iskra M, Zammit N, et al. (2021). *Slow-Paced Breathing: Influence of
  Inhalation/Exhalation Ratio and of Respiratory Pauses on Cardiac Vagal Activity.*
  Sustainability 13(14):7775. — longer exhale > inhale raises RMSSD; pauses add nothing.
- Lehrer PM, et al. (2013). *Protocol for heart rate variability biofeedback training.*
  Biofeedback 41(3):98–109. — RF assessment / 4.5–7 bpm range.
- Shaffer F, Meehan ZM. (2020). *A practical guide to resonance frequency assessment for
  heart rate variability biofeedback.* Frontiers in Neuroscience 14:570400. — sweep method.
