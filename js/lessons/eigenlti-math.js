// Math for lesson 14 (exponentials are eigenvectors), free of the DOM.

import { TAU } from "../cmath.js";

/** The Fourier vector of frequency k, length N: v[n] = e^{2πi k n / N}, as [re[], im[]]. */
export function fourierVector(k, N) {
  return [Array.from({ length: N }, (_, n) => Math.cos((TAU * k * n) / N)), Array.from({ length: N }, (_, n) => Math.sin((TAU * k * n) / N))];
}

/** Taps padded with zeros to length N. */
export const padTo = (taps, N) => Array.from({ length: N }, (_, i) => taps[i] ?? 0);

/**
 * A moving average over the last W seconds, applied to sin(2πft):
 * y(t) = (1/W) ∫_{t−W}^{t} sin(2πfs) ds, worked out exactly.
 */
export function movingAverageOfSine(t, f, W) {
  const w = TAU * f;
  return (Math.cos(w * (t - W)) - Math.cos(w * t)) / (w * W);
}

/** Its gain and delay: the output is gain · sin(2πf(t − W/2)). */
export function movingAverageGain(f, W) {
  const a = Math.PI * f * W;
  return Math.abs(a) < 1e-12 ? 1 : Math.sin(a) / a;
}
