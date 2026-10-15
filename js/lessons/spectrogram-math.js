// Lesson 22's math: test sounds, the short-time Fourier transform, and the
// width of a Gaussian pulse in time and in frequency.

import { TAU, WINDOWS, fft } from "../cmath.js";

export const FS = 1024;     // samples per second
export const DUR = 2;       // seconds
export const LEN = FS * DUR;

const NOTES = [262, 330, 392, 330, 294, 349, 440, 392]; // a made-up tune, Hz

/**
 * A test sound by name: chirp, turns, click or melody. rate defaults to the
 * figure's; the Listen button asks for an audio rate. clickAmp is the click's
 * height (huge on screen so it stands out, gentler for the ear).
 */
export function preset(name, rate = FS, clickAmp = 30) {
  const len = Math.round(rate * DUR);
  const x = new Float64Array(len);
  for (let n = 0; n < len; n++) {
    const t = n / rate;
    if (name === "chirp") {
      // Frequency rises steadily from 40 Hz to 460 Hz: phase is the integral of frequency.
      const f0 = 40, f1 = 460;
      x[n] = Math.sin(TAU * (f0 * t + ((f1 - f0) / (2 * DUR)) * t * t));
    } else if (name === "turns") {
      // Crossfade over 20 ms at each switch: an abrupt jump would be a click,
      // and a click is every frequency at once.
      const phase = (t % 0.5) / 0.5;          // 0..1 over one 180-then-330 cycle
      const r = 0.02 / 0.5;                    // the ramp, as a fraction of the cycle
      const e = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u)));
      // How much of the 330 Hz tone: 0 in the first half, 1 in the second,
      // with a smooth ramp centered on each switch.
      const second = phase < 0.25 ? 1 - e((phase + r / 2) / r)
        : phase < 0.75 ? e((phase - 0.5 + r / 2) / r)
          : 1 - e((phase - 1 + r / 2) / r);
      x[n] = (1 - second) * Math.sin(TAU * 180 * t) + second * Math.sin(TAU * 330 * t);
    } else if (name === "click") {
      x[n] = 0.5 * Math.sin(TAU * 250 * t) + (Math.abs(t - 1) < 0.5 / rate ? clickAmp : 0);
    } else {
      const i = Math.min(NOTES.length - 1, Math.floor(t / (DUR / NOTES.length)));
      const local = t - (i * DUR) / NOTES.length;
      const env = Math.min(1, local / 0.01) * Math.exp(-local * 4);
      x[n] = env * Math.sin(TAU * NOTES[i] * t);
    }
  }
  return x;
}

/**
 * Short-time Fourier transform: slide a window of `win` samples along x in
 * steps of `hop`, FFT each piece. Returns magnitudes in dB, frames × bins,
 * with bins 0..win/2 (0 Hz to FS/2).
 */
export function stft(x, win, hop, windowName = "hann") {
  const w = Float64Array.from({ length: win }, (_, n) => WINDOWS[windowName](n, win));
  const frames = Math.max(1, Math.floor((x.length - win) / hop) + 1);
  const bins = win / 2 + 1;
  const db = new Float32Array(frames * bins);
  const re = new Float64Array(win), im = new Float64Array(win);
  for (let f = 0; f < frames; f++) {
    const s = f * hop;
    for (let n = 0; n < win; n++) { re[n] = x[s + n] * w[n]; im[n] = 0; }
    const X = fft({ re, im });
    for (let k = 0; k < bins; k++) db[f * bins + k] = 10 * Math.log10(X.re[k] ** 2 + X.im[k] ** 2 + 1e-12);
  }
  return { frames, bins, db, hop, win, times: (f) => (f * hop + win / 2) / FS, freq: (k) => (k * FS) / win };
}

/**
 * A Gaussian pulse g(t) = exp(−t²/(2σ²)) sampled at fs across ±span/2, and
 * its spectrum. Widths are the standard deviations of |g|² over time and of
 * |G|² over frequency, measured from the samples.
 */
export function gaussianWidths(sigma, fs = 2048, n = 4096) {
  const t = Float64Array.from({ length: n }, (_, i) => (i - n / 2) / fs);
  const g = t.map((tt) => Math.exp(-(tt * tt) / (2 * sigma * sigma)));
  const spread = (xs, ws) => {
    let s = 0, m = 0, v = 0;
    for (let i = 0; i < xs.length; i++) { s += ws[i]; m += ws[i] * xs[i]; }
    m /= s;
    for (let i = 0; i < xs.length; i++) v += ws[i] * (xs[i] - m) ** 2;
    return Math.sqrt(v / s);
  };
  const st = spread(t, g.map((v) => v * v));
  const X = fft(g);
  const f = Float64Array.from({ length: n }, (_, k) => ((k <= n / 2 ? k : k - n) * fs) / n);
  const P = X.re.map((r, k) => r * r + X.im[k] * X.im[k]);
  const sf = spread(f, P);
  return { t, g, f, P, st, sf };
}
