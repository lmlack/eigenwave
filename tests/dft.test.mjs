import { test } from "node:test";
import assert from "node:assert/strict";
import { orthogonalityGap, rebuildAt, symmetryGap } from "../js/lessons/dft-math.js";
import { dft, mulberry32, signal } from "../js/cmath.js";

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test("F* F = N I for the sizes the lesson uses", () => {
  for (const N of [4, 8, 16]) assert.ok(orthogonalityGap(N) < 1e-9);
});

test("keeping every coefficient rebuilds the samples exactly", () => {
  const r = mulberry32(5);
  for (const N of [8, 16]) {
    const x = Array.from({ length: N }, () => r() * 2 - 1);
    const X = dft(x), all = Array.from({ length: N }, (_, k) => k);
    for (let n = 0; n < N; n++) {
      const [re, im] = rebuildAt(X, all, n);
      close(re, x[n]); close(im, 0);
    }
    // Between samples the curve stays real too.
    close(rebuildAt(X, all, 2.37)[1], 0);
  }
});

test("a pair k and N−k rebuilds a real cosine", () => {
  const N = 8, x = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * 2 * n) / N) + 0.5);
  const X = dft(x);
  const [re, im] = rebuildAt(X, [2, 6], 1.5);
  close(re, Math.cos((2 * Math.PI * 2 * 1.5) / N)); close(im, 0);
  close(rebuildAt(X, [0], 3)[0], 0.5);
});

test("a real signal has a conjugate-symmetric DFT; a complex one doesn't have to", () => {
  const r = mulberry32(9);
  const x = Array.from({ length: 16 }, () => r());
  assert.ok(symmetryGap(dft(x)) < 1e-9);
  assert.ok(symmetryGap(dft(signal(4, [1, 0, 0, 0], [0, 1, 0, 0]))) > 0.5);
});
