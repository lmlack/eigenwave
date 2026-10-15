import { test } from "node:test";
import assert from "node:assert/strict";
import { fourierTerms, rootsOfUnity } from "../js/lessons/roots-math.js";
import { SHAPES, fourierProject, rmsError, sampleShape, sampledInner } from "../js/lessons/functions-math.js";
import {
  downsample, energy, evenPart, flip, fromArray, oddPart, pulse, shift, timeTransform, upsample, wrongOrder,
} from "../js/lessons/signals-math.js";

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);
const sum = (pts) => pts.reduce((s, [x, y]) => [s[0] + x, s[1] + y], [0, 0]);

test("roots of unity sit on the circle and add to zero", () => {
  for (const N of [2, 3, 5, 8, 13]) {
    const r = rootsOfUnity(N);
    for (const [x, y] of r) close(Math.hypot(x, y), 1);
    const s = sum(r);
    close(s[0], 0); close(s[1], 0);
  }
});

test("Fourier vectors: ⟨f_j, f_k⟩ is N when j = k and 0 otherwise", () => {
  const N = 8;
  for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
    const s = sum(fourierTerms(N, j, k));
    close(s[0], j === k ? N : 0); close(s[1], 0);
  }
});

test("sines of different speeds are perpendicular; a sine has squared length π", () => {
  const s = (m) => (x) => Math.sin(m * x), c = (m) => (x) => Math.cos(m * x);
  close(sampledInner(s(2), s(3), 1000), 0);
  close(sampledInner(s(3), s(3), 1000), Math.PI);
  close(sampledInner(s(2), c(2), 1000), 0);
  // Exact for waves once N > m + n.
  close(sampledInner(s(2), s(3), 6), 0);
});

test("the sampled inner product approaches the integral", () => {
  const f = (x) => x, g = (x) => 1; // ∫_0^{2π} x dx = 2π²
  close(sampledInner(f, g, 4000), 2 * Math.PI ** 2, 1e-6);
});

test("projecting a sum of waves finds its coefficients exactly", () => {
  const M = 256;
  const samples = Array.from({ length: M }, (_, n) => {
    const x = ((n + 0.5) * 2 * Math.PI) / M;
    return 0.3 + 2 * Math.cos(x) - 0.5 * Math.sin(3 * x);
  });
  const p = fourierProject(samples, 5);
  close(p.a0, 0.3); close(p.a[0], 2); close(p.b[2], -0.5);
  close(p.b[0], 0); close(p.a[2], 0);
  assert.ok(rmsError(samples, p.at) < 1e-9);
});

test("the square wave's projection gets closer as K grows, using only odd sines", () => {
  const M = 512, sq = sampleShape(SHAPES.square, M);
  let prev = Infinity;
  for (const K of [1, 3, 7, 15]) {
    const p = fourierProject(sq, K);
    const e = rmsError(sq, p.at);
    assert.ok(e < prev); prev = e;
  }
  const p = fourierProject(sq, 4);
  close(p.b[0], 4 / Math.PI, 1e-3); // the first odd sine
  close(p.b[1], 0, 1e-9);           // no even sines
  for (const a of p.a) close(a, 0, 1e-9);
});

test("shift, flip, downsample, upsample", () => {
  const x = fromArray([1, 2, 3], 0); // x[0..2] = 1, 2, 3
  assert.equal(shift(x, 2)(2), 1);
  assert.equal(shift(x, 2)(1), 0);
  assert.equal(flip(x)(-2), 3);
  assert.equal(downsample(x, 2)(1), 3);
  const u = upsample(x, 2);
  assert.deepEqual([0, 1, 2, 3, 4].map(u), [1, 0, 2, 0, 3]);
  // Up then down gives the original back.
  assert.deepEqual([0, 1, 2].map(downsample(u, 2)), [1, 2, 3]);
});

test("even and odd parts add back up, and their energies add", () => {
  const x = fromArray([0.5, -1, 2, 0, 1.5, 3, -2], -3);
  const e = evenPart(x), o = oddPart(x);
  for (let n = -5; n <= 5; n++) {
    close(e(n) + o(n), x(n));
    close(e(-n), e(n));
    close(o(-n), -o(n));
  }
  close(energy(x, -6, 6), energy(e, -6, 6) + energy(o, -6, 6));
});

test("x(at + b) shifts first; the wrong order doesn't", () => {
  const a = 2, b = 1;
  const y = timeTransform(pulse, a, b), z = wrongOrder(pulse, a, b);
  // The ramp of x starts at t = 0, so in y it starts at a t + b = 0, t = −1/2.
  close(y(-0.5 + 1e-6), pulse(1e-6 * a));
  assert.equal(y(-0.6), 0);
  assert.ok(z(-0.9) > 0); // the mistake starts at t = −1
  assert.equal(timeTransform(pulse, 1, b)(0.3), wrongOrder(pulse, 1, b)(0.3));
});
