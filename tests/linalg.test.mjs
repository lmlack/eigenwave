import { test } from "node:test";
import assert from "node:assert/strict";
import {
  angle2, avoidedPair, coeffs, cosine8, det2, dot2, dotN, eig2, fromCols, haar8, inv2, mulMM, mulMV, project, rebuild, solve2,
} from "../js/lessons/linalg-math.js";

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test("dot product, angle and projection", () => {
  close(dot2([1, 2], [3, -1]), 1);
  close(angle2([1, 0], [0, 2]), Math.PI / 2);
  close(angle2([1, 1], [-1, -1]), Math.PI);
  const p = project([2, 3], [1, 0]);
  close(p[0], 2); close(p[1], 0);
  // What's left over is perpendicular to a.
  const a = [1, 2], b = [3, 1], q = project(b, a);
  close(dot2([b[0] - q[0], b[1] - q[1]], a), 0);
});

test("determinant, inverse and solving", () => {
  const A = [[2, 1], [1, 3]];
  close(det2(A), 5);
  const I = mulMM(A, inv2(A));
  close(I[0][0], 1); close(I[0][1], 0); close(I[1][0], 0); close(I[1][1], 1);
  assert.equal(inv2([[1, 2], [2, 4]]), null);
  const c = solve2(fromCols([1, 1], [-1, 1]), [3, 1]);
  close(c[0], 2); close(c[1], -1);
});

test("A x is a combination of A's columns", () => {
  const A = fromCols([2, 1], [-1, 3]);
  const y = mulMV(A, [0.5, 2]);
  close(y[0], 0.5 * 2 + 2 * -1); close(y[1], 0.5 * 1 + 2 * 3);
});

test("eigenvalues and eigenvectors", () => {
  const A = [[2, 1], [1, 2]];
  const e = eig2(A);
  assert.ok(e.real);
  close(e.values[0], 3); close(e.values[1], 1);
  for (let i = 0; i < 2; i++) {
    const v = e.vectors[i], Av = mulMV(A, v);
    close(Av[0], e.values[i] * v[0]); close(Av[1], e.values[i] * v[1]);
  }
  const R = eig2([[0, -1], [1, 0]]);
  assert.equal(R.real, false);
  close(R.values[0][1], 1);
  const S = eig2([[2, 0], [0, 2]]);
  assert.ok(S.real); close(S.values[0], 2);
});

test("the avoided crossing never closes while ε ≠ 0", () => {
  for (const a of [-1, -0.1, 0, 0.3]) {
    const [hi, lo] = avoidedPair(a, 0.2);
    assert.ok(hi - lo >= 0.4 - 1e-12);
    const e = eig2([[a, 0.2], [0.2, -a]]);
    close(e.values[0], hi); close(e.values[1], lo);
  }
});

test("Haar and cosine bases are orthonormal, and dot products rebuild exactly", () => {
  for (const B of [haar8(), cosine8()]) {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) close(dotN(B[i], B[j]), i === j ? 1 : 0);
    const x = [0.5, 1.5, 2, 1, -0.5, -1.5, -1, 0.25];
    const y = rebuild(B, coeffs(B, x));
    for (let n = 0; n < 8; n++) close(y[n], x[n]);
  }
});
