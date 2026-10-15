import { test } from "node:test";
import assert from "node:assert/strict";
import { demodulate, message1, message2, modulate, rmsError, spectrum, t } from "../js/lessons/modulation-math.js";

test("multiplying by the carrier again and low-passing gives the message back", () => {
  const m = t.map(message1);
  const { out } = demodulate(modulate(m, 30), 30);
  assert.ok(rmsError(out, m) < 1e-6);
});

test("a receiver carrier 90° off gets nothing", () => {
  const m = t.map(message1);
  const { out } = demodulate(modulate(m, 30), 30, Math.PI / 2);
  assert.ok(Math.max(...out.map(Math.abs)) < 1e-6);
});

test("two stations far apart don't interfere; too close, they do", () => {
  const m1 = t.map(message1), m2 = t.map(message2);
  const both = (f1, f2) => modulate(m1, f1).map((v, n) => v + modulate(m2, f2)[n]);
  assert.ok(rmsError(demodulate(both(20, 40), 20).out, m1) < 1e-6);
  assert.ok(rmsError(demodulate(both(20, 23), 20).out, m1) > 0.1);
});

test("modulating moves the message's spectrum to ±fc", () => {
  const sp = spectrum(modulate(t.map(message1), 30));
  const peak = sp.reduce((a, b) => (b[1] > a[1] ? b : a));
  assert.ok(Math.abs(Math.abs(peak[0]) - 30) <= 4.5);
});
