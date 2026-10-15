// DOM-free math for lesson 9: inner products of sampled functions, and
// projecting a function onto the first K sines and cosines.

import { TAU } from "../cmath.js";

/**
 * The sampled inner product Σ f(x_n) g(x_n) Δx over [a, b] with N points at
 * the middles of N equal pieces. As N grows it becomes ∫ f g dx.
 */
export function sampledInner(f, g, N, a = 0, b = TAU) {
  const dx = (b - a) / N;
  let s = 0;
  for (let n = 0; n < N; n++) {
    const x = a + (n + 0.5) * dx;
    s += f(x) * g(x) * dx;
  }
  return s;
}

/**
 * Project samples of a function on [0, 2π) (M values at the middles of M
 * equal pieces) onto 1, cos kx, sin kx for k = 1..K. Each coefficient is an
 * inner product divided by the basis function's squared length:
 *   a0 = ⟨f, 1⟩ / 2π,  a_k = ⟨f, cos kx⟩ / π,  b_k = ⟨f, sin kx⟩ / π.
 * Returns { a0, a, b, at(x) } with a[k-1], b[k-1].
 */
export function fourierProject(samples, K) {
  const M = samples.length;
  const dx = TAU / M;
  let a0 = 0;
  const a = new Array(K).fill(0), b = new Array(K).fill(0);
  for (let n = 0; n < M; n++) {
    const x = (n + 0.5) * dx, f = samples[n];
    a0 += f * dx;
    for (let k = 1; k <= K; k++) {
      a[k - 1] += f * Math.cos(k * x) * dx;
      b[k - 1] += f * Math.sin(k * x) * dx;
    }
  }
  a0 /= TAU;
  for (let k = 0; k < K; k++) { a[k] /= Math.PI; b[k] /= Math.PI; }
  const at = (x) => {
    let s = a0;
    for (let k = 1; k <= K; k++) s += a[k - 1] * Math.cos(k * x) + b[k - 1] * Math.sin(k * x);
    return s;
  };
  return { a0, a, b, at };
}

/** Root-mean-square size of samples, and of the gap between samples and a function. */
export function rms(samples) {
  return Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
}
export function rmsError(samples, at) {
  const M = samples.length;
  let s = 0;
  for (let n = 0; n < M; n++) s += (samples[n] - at(((n + 0.5) * TAU) / M)) ** 2;
  return Math.sqrt(s / M);
}

/** Preset shapes on [0, 2π), M samples. */
export const SHAPES = {
  square: (x) => (x < Math.PI ? 1 : -1),
  sawtooth: (x) => 1 - x / Math.PI,
  triangle: (x) => (x < Math.PI ? -1 + (2 * x) / Math.PI : 3 - (2 * x) / Math.PI),
  pulse: (x) => (Math.abs(x - Math.PI) < 0.6 ? 1.2 : 0),
};
export function sampleShape(f, M) {
  return Array.from({ length: M }, (_, n) => f(((n + 0.5) * TAU) / M));
}
