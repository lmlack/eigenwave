import { test } from "node:test";
import assert from "node:assert/strict";
import { convMatrix, terms } from "../js/lessons/convolution-math.js";
import { convolve, matVec } from "../js/cmath.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} vs ${b}`);

test("the convolution matrix times x is x * h", () => {
  const x = [1, -0.5, 2, 0, 1.5, 1], h = [1, 0.7, 0.49, 0.2];
  const y = convolve(x, h), Ty = matVec(convMatrix(h, x.length), x);
  assert.equal(Ty.length, y.length);
  y.forEach((v, i) => close(v, Ty[i]));
});

test("the convolution matrix is constant along its diagonals", () => {
  const T = convMatrix([3, 1, 4], 5);
  for (let n = 1; n < T.length; n++) for (let k = 1; k < 5; k++) assert.equal(T[n][k], T[n - 1][k - 1]);
});

test("the terms of y[n] add up to y[n]", () => {
  const x = [1, 2, 0, -1], h = [0.5, 1, -1];
  const y = convolve(x, h);
  for (let n = 0; n < y.length; n++) close(terms(x, h, n).reduce((s, v) => s + v, 0), y[n]);
  assert.deepEqual(terms(x, h, -1), [0, 0, 0, 0]);
});
