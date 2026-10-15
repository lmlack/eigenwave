// Math for lessons 16–19 (Fourier series, the transform, leakage, the FFT),
// free of the DOM so it can be tested.

import { TAU, fft, signal } from "../cmath.js";

/* ---------- Lesson 16: Fourier series of standard waves ---------- */

/**
 * The three preset waves, period 1, swinging between −1 and 1. Each is odd,
 * so its series is all sines: f(t) = Σ b_k sin(2π k t).
 */
export const WAVES = {
  square: {
    f: (t) => (frac(t) < 0.5 ? 1 : -1),
    b: (k) => (k % 2 ? 4 / (Math.PI * k) : 0),
  },
  sawtooth: {
    // Rises from −1 to 1 across a period, then drops.
    f: (t) => 2 * (frac(t + 0.5) - 0.5),
    b: (k) => (2 * (k % 2 ? 1 : -1)) / (Math.PI * k),
  },
  triangle: {
    f: (t) => { const u = frac(t + 0.25); return u < 0.5 ? 4 * u - 1 : 3 - 4 * u; },
    b: (k) => (k % 2 ? ((8 / (Math.PI * Math.PI * k * k)) * (((k - 1) / 2) % 2 ? -1 : 1)) : 0),
  },
};
const frac = (t) => t - Math.floor(t);

/** The sine coefficients b_1..b_K of a preset, as an array indexed by k (index 0 unused). */
export function sineCoeffs(name, K) {
  const b = new Array(K + 1).fill(0);
  for (let k = 1; k <= K; k++) b[k] = WAVES[name].b(k);
  return b;
}

/** Σ b_k sin(2πkt) over the harmonics k = 1..K that `on(k)` allows. */
export function partialSum(b, t, on = () => true) {
  let s = 0;
  for (let k = 1; k < b.length; k++) if (b[k] && on(k)) s += b[k] * Math.sin(TAU * k * t);
  return s;
}

/** The highest value of a partial sum over one period, found on a fine grid. */
export function peak(b, on = () => true, samples = 4000) {
  let m = -Infinity;
  for (let i = 0; i < samples; i++) m = Math.max(m, partialSum(b, i / samples, on));
  return m;
}

/* ---------- Lesson 16: complex series of a drawn closed curve ---------- */

/** Resample a closed polyline [[x, y], ...] to M points evenly spaced along its length. */
export function resampleClosed(pts, M) {
  const P = [...pts, pts[0]];
  const seg = [];
  let total = 0;
  for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(d); total += d; }
  if (total === 0) return Array.from({ length: M }, () => [...pts[0]]);
  const out = [];
  let i = 0, acc = 0;
  for (let m = 0; m < M; m++) {
    const target = (total * m) / M;
    while (i < seg.length - 1 && acc + seg[i] < target) { acc += seg[i]; i++; }
    const u = seg[i] ? (target - acc) / seg[i] : 0;
    out.push([P[i][0] + u * (P[i + 1][0] - P[i][0]), P[i][1] + u * (P[i + 1][1] - P[i][1])]);
  }
  return out;
}

/**
 * Complex Fourier coefficients of a closed curve, treated as z(t) = x + iy
 * for t from 0 to 1: c_k = (1/M) Σ z_n e^{−2πi k n/M}. Returns [{ k, re, im, r }]
 * for k = −K..K, biggest circle first (the order the epicycles are drawn in).
 */
export function curveCoeffs(pts, K) {
  const M = pts.length;
  const out = [];
  for (let k = -K; k <= K; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < M; n++) {
      const t = (-TAU * k * n) / M;
      const c = Math.cos(t), s = Math.sin(t);
      re += pts[n][0] * c - pts[n][1] * s;
      im += pts[n][0] * s + pts[n][1] * c;
    }
    out.push({ k, re: re / M, im: im / M, r: Math.hypot(re, im) / M });
  }
  // The constant term (k = 0) is the center: it goes first, then by size.
  return out.sort((a, b) => (a.k === 0 ? -1 : b.k === 0 ? 1 : b.r - a.r));
}

/** The point the epicycles reach at time t (0..1) using the first `count` terms. */
export function epicyclePoint(coeffs, t, count = coeffs.length) {
  let x = 0, y = 0;
  for (let j = 0; j < Math.min(count, coeffs.length); j++) {
    const { k, re, im } = coeffs[j];
    const a = TAU * k * t, c = Math.cos(a), s = Math.sin(a);
    x += re * c - im * s;
    y += re * s + im * c;
  }
  return [x, y];
}

/* ---------- Lesson 17: pulse train → transform ---------- */

export const sinc = (x) => (Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

/**
 * A pulse train: height 1 for |t| < τ/2 in each period T, 0 otherwise.
 * Its series coefficients are c_k = (τ/T) sinc(kτ/T).
 */
export const pulseCoeff = (k, tau, T) => (tau / T) * sinc((k * tau) / T);

/** The transform of one pulse of width τ: X(f) = τ sinc(fτ). */
export const pulseTransform = (f, tau) => tau * sinc(f * tau);

/** Energy of one pulse in time (∫|x|²dt = τ) and the frequency-side sum Σ|T c_k|²·(1/T) over |k| ≤ K. */
export function pulseEnergy(tau, T, K) {
  let s = 0;
  for (let k = -K; k <= K; k++) s += (T * pulseCoeff(k, tau, T)) ** 2 / T;
  return { time: tau, freq: s };
}

/* ---------- Lesson 18: leakage and windows ---------- */

/** |DFT| of x zero-padded to length L (a power of two), as an array. */
export function paddedMag(x, L) {
  const s = signal(L);
  s.re.set(x.slice(0, L));
  const X = fft(s);
  return Array.from(X.re, (r, i) => Math.hypot(r, X.im[i]));
}

/**
 * The highest side lobe of a window's spectrum, in dB below the main lobe,
 * and the main lobe's full width in DFT bins (null to null).
 */
export function windowLobes(w, pad = 64) {
  const N = w.length;
  const L = 2 ** Math.ceil(Math.log2(N * pad));
  const m = paddedMag(w, L);
  const peak = m[0];
  // Walk out from the center to the first null (the first local minimum).
  let i = 1;
  while (i < L / 2 && m[i + 1] < m[i]) i++;
  let side = 0;
  for (let j = i; j < L / 2; j++) side = Math.max(side, m[j]);
  return { sideDb: 20 * Math.log10(side / peak), mainWidth: (2 * i * N) / L };
}

/* ---------- Lesson 19: the FFT, stage by stage ---------- */

/** The bit-reversed order of 0..N−1 (N a power of two). */
export function bitReverse(N) {
  const bits = Math.log2(N);
  return Array.from({ length: N }, (_, i) => {
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    return r;
  });
}

/**
 * Every stage of a radix-2 FFT on x (real or { re, im }), for drawing.
 * stages[0] is the input in bit-reversed order; stages[s] is after the s-th
 * round of butterflies. butterflies[s] lists { a, b, k, half } for that round:
 * new[a] = old[a] + W^k old[b], new[b] = old[a] − W^k old[b], W = e^{−2πi/len}.
 */
export function fftStages(x) {
  const N = x.length ?? x.re.length;
  const re0 = x.re ? Array.from(x.re) : Array.from(x);
  const im0 = x.im ? Array.from(x.im) : new Array(N).fill(0);
  const order = bitReverse(N);
  let cur = order.map((i) => [re0[i], im0[i]]);
  const stages = [cur.map((v) => [...v])];
  const butterflies = [];
  for (let len = 2; len <= N; len *= 2) {
    const next = cur.map((v) => [...v]);
    const flies = [];
    for (let i = 0; i < N; i += len) {
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2;
        const ang = (-TAU * j) / len;
        const w = [Math.cos(ang), Math.sin(ang)];
        const t = [cur[b][0] * w[0] - cur[b][1] * w[1], cur[b][0] * w[1] + cur[b][1] * w[0]];
        next[a] = [cur[a][0] + t[0], cur[a][1] + t[1]];
        next[b] = [cur[a][0] - t[0], cur[a][1] - t[1]];
        // The twiddle as a power of W_N: e^{−2πi j/len} = W_N^{j·N/len}.
        flies.push({ a, b, k: (j * N) / len, len });
      }
    }
    butterflies.push(flies);
    stages.push(next.map((v) => [...v]));
    cur = next;
  }
  return { order, stages, butterflies };
}

/** Complex multiplications: the plain DFT does N², the FFT (N/2)·log₂N. */
export const dftOps = (N) => N * N;
export const fftOps = (N) => (N / 2) * Math.log2(N);
