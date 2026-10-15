// Lesson 24's math: messages, carriers, and getting a message back by
// multiplying by the carrier again and low-passing.

import { TAU, fft, signedBin } from "../cmath.js";

export const FS = 256;  // samples a second
export const N = 512;   // two seconds, so FFT bins are 0.5 Hz apart
export const t = Float64Array.from({ length: N }, (_, n) => n / FS);

/** Two slow messages, each under about 5 Hz. */
export const message1 = (tt) => 0.6 * Math.sin(TAU * 1.5 * tt) + 0.35 * Math.cos(TAU * 4 * tt);
export const message2 = (tt) => 0.5 * Math.sin(TAU * 3 * tt + 0.7) + 0.3 * Math.sin(TAU * 0.5 * tt);
export const BANDWIDTH = 4.5;

/** Ideal low-pass: zero every FFT bin above cutoff Hz. */
export function lowpass(x, cutoff) {
  const X = fft(x);
  const keep = (k) => Math.abs((signedBin(k, x.length) * FS) / x.length) <= cutoff;
  return fft({ re: X.re.map((v, k) => (keep(k) ? v : 0)), im: X.im.map((v, k) => (keep(k) ? v : 0)) }, true).re;
}

/** DSB modulation: the message times a cosine carrier at fc Hz. */
export const modulate = (m, fc) => m.map((v, n) => v * Math.cos(TAU * fc * t[n]));

/**
 * Demodulation: multiply by the receiver's own carrier (frequency fc, phase
 * offset phi), low-pass, and double. With phi = 0 the message comes back;
 * the result is scaled by cos(phi) otherwise.
 */
export function demodulate(y, fc, phi = 0, cutoff = 8) {
  const mixed = y.map((v, n) => 2 * v * Math.cos(TAU * fc * t[n] + phi));
  return { mixed, out: lowpass(mixed, cutoff) };
}

/** Magnitude spectrum over signed frequency, sorted from −FS/2 up. */
export function spectrum(x) {
  const X = fft(x);
  const pts = [];
  for (let k = 0; k < x.length; k++) pts.push([(signedBin(k, x.length) * FS) / x.length, Math.hypot(X.re[k], X.im[k]) / x.length]);
  return pts.sort((a, b) => a[0] - b[0]);
}

export const rmsError = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);
