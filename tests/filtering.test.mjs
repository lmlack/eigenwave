import { test } from "node:test";
import assert from "node:assert/strict";
import { binGains, filterInFrequency, filterInTime, gain, impulseResponse, makeInput, TONES, FS, N } from "../js/lessons/filtering-math.js";

const tone = (f, a) => Float64Array.from({ length: N }, (_, n) => a * Math.sin((2 * Math.PI * f * n) / FS));

test("multiplying spectra and convolving with h give the same output", () => {
  const { x } = makeInput();
  for (const spec of [
    { type: "low", shape: "ideal", f1: 12 },
    { type: "band", shape: "smooth", f1: 15, f2: 30 },
    { type: "high", shape: "smooth", f1: 30 },
  ]) {
    const H = binGains(spec);
    const a = filterInFrequency(x, H).y, b = filterInTime(x, impulseResponse(H));
    for (let n = 0; n < N; n++) assert.ok(Math.abs(a[n] - b[n]) < 1e-9);
  }
});

test("an ideal low-pass at 12 Hz keeps the 5 Hz tone and removes the others", () => {
  const x = TONES.reduce((s, [f, a]) => s.map((v, n) => v + tone(f, a)[n]), new Float64Array(N));
  const y = filterInFrequency(x, binGains({ type: "low", shape: "ideal", f1: 12 })).y;
  const want = tone(5, 1);
  for (let n = 0; n < N; n++) assert.ok(Math.abs(y[n] - want[n]) < 1e-9);
});

test("the impulse response of a real, even filter is real and even", () => {
  const h = impulseResponse(binGains({ type: "low", shape: "smooth", f1: 20 }));
  for (let n = 1; n < N / 2; n++) assert.ok(Math.abs(h[n] - h[N - n]) < 1e-12);
});

test("smooth gains: 1/√2 at the cutoff, band-pass peaks near 1 between", () => {
  assert.ok(Math.abs(gain(20, { type: "low", shape: "smooth", f1: 20 }) - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(gain(20, { type: "high", shape: "smooth", f1: 20 }) - Math.SQRT1_2) < 1e-12);
  assert.ok(gain(25, { type: "band", shape: "smooth", f1: 10, f2: 60 }) > 0.98);
});
