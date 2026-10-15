import { test } from "node:test";
import assert from "node:assert/strict";
import { dft, WINDOWS } from "../js/cmath.js";
import {
  WAVES, bitReverse, curveCoeffs, epicyclePoint, fftStages, partialSum, peak, pulseCoeff, pulseEnergy,
  pulseTransform, resampleClosed, sineCoeffs, windowLobes,
} from "../js/lessons/fourier-math.js";

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test("preset coefficients match the projection integral 2∫ f(t) sin(2πkt) dt", () => {
  const M = 20000;
  for (const name of Object.keys(WAVES)) {
    for (let k = 1; k <= 6; k++) {
      let s = 0;
      for (let i = 0; i < M; i++) { const t = (i + 0.5) / M; s += WAVES[name].f(t) * Math.sin(2 * Math.PI * k * t); }
      close(2 * s / M, WAVES[name].b(k), 2e-3);
    }
  }
});

test("partial sums converge to the wave away from the jumps", () => {
  for (const name of Object.keys(WAVES)) {
    const b = sineCoeffs(name, 400);
    close(partialSum(b, 0.2), WAVES[name].f(0.2), 0.01);
  }
});

test("Gibbs: the square wave overshoots by about 9% of the jump, however many terms", () => {
  for (const K of [25, 101, 301]) {
    const over = (peak(sineCoeffs("square", K), undefined, 40000) - 1) / 2;
    close(over, 0.0895, 0.004);
  }
});

test("switching off a harmonic removes exactly its term", () => {
  const b = sineCoeffs("square", 9);
  const t = 0.13;
  close(partialSum(b, t) - partialSum(b, t, (k) => k !== 3), b[3] * Math.sin(2 * Math.PI * 3 * t), 1e-12);
});

test("a circle drawn once is one coefficient at k = 1", () => {
  const pts = Array.from({ length: 64 }, (_, n) => [2 + Math.cos((2 * Math.PI * n) / 64), Math.sin((2 * Math.PI * n) / 64)]);
  const c = curveCoeffs(pts, 5);
  assert.equal(c[0].k, 0); close(c[0].re, 2); close(c[0].im, 0);
  assert.equal(c[1].k, 1); close(c[1].r, 1);
  for (const x of c.slice(2)) close(x.r, 0);
});

test("all the epicycles together retrace the resampled curve", () => {
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const M = 32;
  const pts = resampleClosed(square, M);
  const c = curveCoeffs(pts, M / 2);
  // With every term, z(n/M) comes back exactly at the sample points (up to the one doubled Nyquist term).
  const p = epicyclePoint(c, 3 / M, c.length);
  close(p[0], pts[3][0], 0.05); close(p[1], pts[3][1], 0.05);
});

test("resampling spaces points evenly along the length", () => {
  const pts = resampleClosed([[0, 0], [4, 0], [4, 1], [0, 1]], 10);
  for (let i = 1; i < 10; i++) close(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), 1, 1e-9);
});

test("pulse-train coefficients match a numeric DFT of the pulse train", () => {
  const T = 4, tau = 1, M = 4000;
  const x = Array.from({ length: M }, (_, n) => { let t = (n / M) * T; if (t > T / 2) t -= T; return Math.abs(t) < tau / 2 ? 1 : 0; });
  const X = dft(x);
  for (const k of [0, 1, 2, 3, 5]) close(X.re[k] / M, pulseCoeff(k, tau, T), 2e-3);
  // T c_k samples the transform of one pulse at f = k / T.
  close(T * pulseCoeff(3, tau, T), pulseTransform(3 / T, tau), 1e-12);
});

test("Parseval for the pulse: the frequency sum climbs to τ", () => {
  const e = pulseEnergy(0.5, 6, 2000);
  close(e.freq, e.time, 0.002);
  assert.ok(pulseEnergy(0.5, 6, 3).freq < e.time);
});

test("window side lobes sit where the textbooks put them", () => {
  const N = 64;
  const lobes = (name) => windowLobes(Array.from({ length: N }, (_, n) => WINDOWS[name](n, N)));
  close(lobes("rect").sideDb, -13.3, 0.4);
  close(lobes("hann").sideDb, -31.5, 0.8);
  close(lobes("hamming").sideDb, -42.7, 1.5);
  close(lobes("blackman").sideDb, -58.1, 1.5);
  close(lobes("rect").mainWidth, 2, 0.1);
  close(lobes("hann").mainWidth, 4, 0.15);
});

test("bit reversal for N = 8", () => {
  assert.deepEqual(bitReverse(8), [0, 4, 2, 6, 1, 5, 3, 7]);
});

test("the last FFT stage is the DFT", () => {
  const x = [1, 2, -1, 0.5, 3, 0, -2, 1];
  const { stages, butterflies } = fftStages(x);
  assert.equal(stages.length, 4);
  assert.equal(butterflies.length, 3);
  for (const fl of butterflies) assert.equal(fl.length, 4);
  const X = dft(x), out = stages[3];
  for (let k = 0; k < 8; k++) { close(out[k][0], X.re[k], 1e-9); close(out[k][1], X.im[k], 1e-9); }
});
