// Sound-building math for the "Listen" buttons, free of the DOM so it can be
// tested: band-limited resampling (so aliasing sounds like aliasing, not like
// the browser's resampler), filtering by FFT, and frequency estimates.

import { TAU, fft, nextPow2 } from "./cmath.js";

/**
 * Rebuild samples taken at inRate as a smooth signal at outRate, the way an
 * ideal converter would: a sum of sinc pulses (Hann-windowed, `half` taps
 * each side). Whatever the samples say is what you hear, aliases included.
 */
export function reconstruct(samples, inRate, outRate, half = 24) {
  const n = Math.floor((samples.length / inRate) * outRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = (i * inRate) / outRate; // position in input samples
    const c = Math.floor(u);
    let s = 0;
    for (let k = c - half + 1; k <= c + half; k++) {
      if (k < 0 || k >= samples.length) continue;
      const d = u - k;
      const sinc = d === 0 ? 1 : Math.sin(Math.PI * d) / (Math.PI * d);
      const w = 0.5 + 0.5 * Math.cos((Math.PI * d) / half);
      s += samples[k] * sinc * w;
    }
    out[i] = s;
  }
  return out;
}

/** A sine at f Hz, sampled fs times a second, for `seconds`. */
export const sampledSine = (f, fs, seconds) =>
  Float64Array.from({ length: Math.round(fs * seconds) }, (_, n) => Math.sin((TAU * f * n) / fs));

/**
 * A sweep from f0 to f1 Hz over `seconds`, sampled fs times a second. The
 * phase adds up the frequency, so the pitch rises smoothly.
 */
export function sampledSweep(f0, f1, fs, seconds) {
  const n = Math.round(fs * seconds);
  const out = new Float64Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin(ph);
    ph += (TAU * (f0 + ((f1 - f0) * i) / n)) / fs;
  }
  return out;
}

/**
 * Filter a real signal in frequency: multiply each FFT bin by gain(f), f in
 * Hz (always ≥ 0), and transform back. Pads to a power of two.
 */
export function fftFilter(x, rate, gain) {
  const N = nextPow2(x.length);
  const re = new Float64Array(N);
  re.set(x);
  const X = fft({ re, im: new Float64Array(N) });
  for (let k = 0; k < N; k++) {
    const f = (Math.min(k, N - k) * rate) / N;
    const g = gain(f);
    X.re[k] *= g; X.im[k] *= g;
  }
  return fft(X, true).re.slice(0, x.length);
}

/** The strongest frequency in a signal, in Hz (by FFT peak). */
export function peakFrequency(x, rate) {
  const N = nextPow2(x.length);
  const re = new Float64Array(N);
  re.set(x);
  const X = fft({ re, im: new Float64Array(N) });
  let best = 1, bestP = -1;
  for (let k = 1; k < N / 2; k++) {
    const p = X.re[k] ** 2 + X.im[k] ** 2;
    if (p > bestP) { bestP = p; best = k; }
  }
  return (best * rate) / N;
}

/** Repeat a function of time t (seconds) into samples. */
export const render = (f, seconds, rate) => Float64Array.from({ length: Math.round(seconds * rate) }, (_, i) => f(i / rate));
