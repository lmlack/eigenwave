// Lesson 20's math, free of the DOM: a test signal, filter shapes, and the
// same filter applied two ways (multiply spectra, or convolve in time).

import { TAU, circConvolve, fft, gaussian, mulberry32, signedBin } from "../cmath.js";

// One second at 256 samples a second, so FFT bin k is exactly k Hz.
export const FS = 256;
export const N = 256;
export const TONES = [[5, 1], [20, 0.6], [45, 0.45]];

/** Three sines plus seeded noise. Returns the time axis, the input, and the noiseless sum. */
export function makeInput(noise = 0.25, seed = 4) {
  const g = gaussian(mulberry32(seed));
  const t = Float64Array.from({ length: N }, (_, n) => n / FS);
  const clean = t.map((tt) => TONES.reduce((s, [f, a]) => s + a * Math.sin(TAU * f * tt), 0));
  const x = clean.map((v) => v + noise * g());
  return { t, x, clean };
}

/**
 * Gain at frequency f (Hz, f ≥ 0) for a filter spec:
 * { type: "low" | "high" | "band", shape: "ideal" | "smooth", f1, f2, order }.
 * Low and high use f1; band keeps f1 to f2. Smooth is a Butterworth-style
 * magnitude, 1 / sqrt(1 + (f / fc)^(2·order)).
 */
export function gain(f, { type, shape, f1, f2, order = 4 }) {
  f = Math.abs(f);
  if (shape === "ideal") {
    if (type === "low") return f <= f1 ? 1 : 0;
    if (type === "high") return f >= f1 ? 1 : 0;
    return f >= f1 && f <= f2 ? 1 : 0;
  }
  const lp = (fc) => 1 / Math.sqrt(1 + (f / fc) ** (2 * order));
  const hp = (fc) => (f === 0 ? 0 : 1 / Math.sqrt(1 + (fc / f) ** (2 * order)));
  if (type === "low") return lp(f1);
  if (type === "high") return hp(f1);
  return lp(f2) * hp(f1);
}

/** The filter as one real gain per FFT bin, the same for +f and −f. */
export function binGains(spec, n = N, fs = FS) {
  return Float64Array.from({ length: n }, (_, k) => gain((signedBin(k, n) * fs) / n, spec));
}

/** Filter by multiplying spectra: Y[k] = H[k] X[k], then back to time. */
export function filterInFrequency(x, H) {
  const X = fft(x);
  const Y = { re: X.re.map((v, k) => v * H[k]), im: X.im.map((v, k) => v * H[k]) };
  return { X, Y, y: fft(Y, true).re };
}

/** The impulse response h[n]: the inverse FFT of the gains. Real and even, since H is. */
export const impulseResponse = (H) => fft({ re: Float64Array.from(H), im: new Float64Array(H.length) }, true).re;

/** The same filter in time: circular convolution with h. */
export const filterInTime = (x, h) => circConvolve(h, x);
