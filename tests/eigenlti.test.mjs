import { test } from "node:test";
import assert from "node:assert/strict";
import { fourierVector, movingAverageGain, movingAverageOfSine, padTo } from "../js/lessons/eigenlti-math.js";
import { circulant, dft, matVec } from "../js/cmath.js";

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test("a Fourier vector comes out of a circulant matrix scaled by H[k]", () => {
  const N = 16, h = padTo([1 / 3, 1 / 3, 1 / 3], N), A = circulant(h), H = dft(h);
  for (const k of [0, 1, 5, 8, 13]) {
    const [vr, vi] = fourierVector(k, N);
    const yr = matVec(A, vr), yi = matVec(A, vi);
    for (let n = 0; n < N; n++) {
      close(yr[n], H.re[k] * vr[n] - H.im[k] * vi[n]);
      close(yi[n], H.re[k] * vi[n] + H.im[k] * vr[n]);
    }
  }
});

test("a moving average of a sine is the same sine, scaled and delayed by W/2", () => {
  const f = 1.3, W = 0.4, g = movingAverageGain(f, W);
  for (const t of [0, 0.37, 1.1, 2.5]) close(movingAverageOfSine(t, f, W), g * Math.sin(2 * Math.PI * f * (t - W / 2)));
  // Against a plain numerical average.
  const t = 0.9, M = 4000;
  let s = 0;
  for (let i = 0; i < M; i++) s += Math.sin(2 * Math.PI * f * (t - W + ((i + 0.5) * W) / M));
  close(movingAverageOfSine(t, f, W), s / M, 1e-6);
  close(movingAverageGain(0, W), 1);
  close(movingAverageGain(1 / W, W), 0);
});
