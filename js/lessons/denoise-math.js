// Lesson 21's math: two tones under noise, and cleaning by keeping only the
// FFT bins whose power clears a threshold.

import { TAU, fft, gaussian, mulberry32 } from "../cmath.js";

export const FS = 256;
export const N = 256;
export const TONES = [[12, 1], [31, 0.7]];

export function makeNoisy(sigma, seed = 7) {
  const g = gaussian(mulberry32(seed));
  const t = Float64Array.from({ length: N }, (_, n) => n / FS);
  const clean = t.map((tt) => TONES.reduce((s, [f, a]) => s + a * Math.sin(TAU * f * tt), 0));
  const noisy = clean.map((v) => v + sigma * g());
  return { t, clean, noisy };
}

/** Power per bin, |X[k]|² / N. */
export const power = (X) => Float64Array.from(X.re, (r, k) => (r * r + X.im[k] * X.im[k]) / X.re.length);

/** Keep the bins with power above thr, zero the rest, and transform back. */
export function denoise(noisy, thr) {
  const X = fft(noisy);
  const P = power(X);
  const keep = Array.from(P, (p) => p > thr);
  const Y = { re: X.re.map((v, k) => (keep[k] ? v : 0)), im: X.im.map((v, k) => (keep[k] ? v : 0)) };
  return { X, P, keep, cleaned: fft(Y, true).re };
}

/** Root-mean-square difference between two signals. */
export const rmsError = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);
