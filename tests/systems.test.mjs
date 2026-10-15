import { test } from "node:test";
import assert from "node:assert/strict";
import { SYSTEMS, fromArray, linearityGap, shiftGap } from "../js/lessons/systems-math.js";
import { periodOf, reduce } from "../js/lessons/basics-math.js";
import { mulberry32 } from "../js/cmath.js";

const ns = Array.from({ length: 41 }, (_, i) => i - 20);
const rand = mulberry32(11);
const randomSignal = () => fromArray(Array.from({ length: 9 }, () => rand() * 2 - 1), -2);

test("each system's linear flag matches a numerical check", () => {
  for (const s of SYSTEMS) {
    let worst = 0;
    for (let t = 0; t < 6; t++) worst = Math.max(worst, linearityGap(s, randomSignal(), randomSignal(), rand() * 4 - 2, rand() * 4 - 2, ns));
    assert.equal(worst < 1e-9, s.linear, `${s.id}: gap ${worst}`);
  }
});

test("each system's time-invariant flag matches a numerical check", () => {
  for (const s of SYSTEMS) {
    let worst = 0;
    for (const n0 of [1, 2, -3]) worst = Math.max(worst, shiftGap(s, randomSignal(), n0, ns));
    assert.equal(worst < 1e-9, s.ti, `${s.id}: gap ${worst}`);
  }
});

test("every system explains each verdict", () => {
  for (const s of SYSTEMS) for (const k of ["linear", "ti", "causal", "memoryless", "stable"]) assert.ok(s.why[k], `${s.id}.${k}`);
});

test("periods of discrete sinusoids", () => {
  assert.equal(periodOf(...reduce(3, 24)), 16); // π/8
  assert.equal(periodOf(...reduce(24, 24)), 2); // π
  assert.equal(periodOf(...reduce(4, 24)), 12); // π/6
  assert.equal(periodOf(...reduce(0, 24)), 1);
  assert.equal(periodOf(...reduce(9, 24)), 16); // 3π/8
  // Check against the definition: cos(ω(n + N)) = cos(ω n).
  for (let p = 1; p < 48; p++) {
    const N = periodOf(...reduce(p, 24)), w = (p * Math.PI) / 24;
    for (let n = 0; n < 5; n++) assert.ok(Math.abs(Math.cos(w * (n + N)) - Math.cos(w * n)) < 1e-9);
  }
});
