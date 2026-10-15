import { test } from "node:test";
import assert from "node:assert/strict";
import { aliasOf, apparentSpin, sincRebuild } from "../js/lessons/sampling-math.js";

test("frequencies below fs/2 stay put, others fold", () => {
  assert.equal(aliasOf(3, 10), 3);
  assert.equal(aliasOf(9, 10), -1);
  assert.equal(aliasOf(11, 10), 1);
  assert.equal(aliasOf(20, 10), 0);
});

test("samples of f and of its alias are the same numbers", () => {
  const f = 7.3, fs = 5, a = aliasOf(f, fs);
  for (let n = 0; n < 20; n++) assert.ok(Math.abs(Math.sin((2 * Math.PI * f * n) / fs) - Math.sin((2 * Math.PI * a * n) / fs)) < 1e-9);
});

test("sinc rebuilding a well-sampled sine matches it away from the ends", () => {
  const f = 1, fs = 8, T = 1 / fs, n0 = -200;
  const v = Array.from({ length: 401 }, (_, i) => Math.sin(2 * Math.PI * f * (n0 + i) * T));
  for (const t of [0.03, 0.4, 1.1]) assert.ok(Math.abs(sincRebuild(v, n0, T, t) - Math.sin(2 * Math.PI * f * t)) < 0.01);
});

test("a wheel filmed at exactly its spoke rate looks still", () => {
  assert.ok(Math.abs(apparentSpin(6, 24, 4)) < 1e-12);
  assert.ok(apparentSpin(5.5, 24, 4) < 0); // a bit slower than that: it seems to go backwards
});
