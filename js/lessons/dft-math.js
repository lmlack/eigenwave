// Math for lesson 15 (the DFT is a change of basis), free of the DOM.

import { TAU, signedBin } from "../cmath.js";

/** The Fourier matrix entry F[k][n] = e^{−2πi k n / N}, as [re, im]. */
export const fEntry = (k, n, N) => [Math.cos((-TAU * k * n) / N), Math.sin((-TAU * k * n) / N)];

/** The biggest gap between F* F and N I: zero means the columns are orthogonal, each of length √N. */
export function orthogonalityGap(N) {
  let worst = 0;
  for (let j = 0; j < N; j++) for (let l = 0; l < N; l++) {
    let re = 0, im = 0;
    for (let k = 0; k < N; k++) {
      const [ar, ai] = fEntry(k, j, N), [br, bi] = fEntry(k, l, N);
      re += ar * br + ai * bi; // conj(a)·b
      im += ar * bi - ai * br;
    }
    worst = Math.max(worst, Math.hypot(re - (j === l ? N : 0), im));
  }
  return worst;
}

/**
 * Rebuild a signal from some of its DFT coefficients, as a smooth curve:
 * x(t) = (1/N) Σ_{k kept} X[k] e^{2πi k' t / N}, with k' the signed
 * frequency (−N/2 … N/2), so the curve between samples is the slowest wave
 * through them. Returns [re, im] at time t.
 */
export function rebuildAt(X, keep, t) {
  const N = X.re.length;
  let re = 0, im = 0;
  for (const k of keep) {
    const kk = signedBin(k, N);
    // At k = N/2 the signed frequency is ambiguous; use cos only, as the real signal does.
    const a = (TAU * kk * t) / N;
    const c = Math.cos(a), s = k === N / 2 ? 0 : Math.sin(a);
    re += X.re[k] * c - X.im[k] * s;
    im += X.re[k] * s + X.im[k] * c;
  }
  return [re / N, im / N];
}

/** The biggest gap between X[N−k] and the conjugate of X[k]. Zero for a real signal. */
export function symmetryGap(X) {
  const N = X.re.length;
  let worst = 0;
  for (let k = 0; k < N; k++) {
    const j = (N - k) % N;
    worst = Math.max(worst, Math.hypot(X.re[j] - X.re[k], X.im[j] + X.im[k]));
  }
  return worst;
}
