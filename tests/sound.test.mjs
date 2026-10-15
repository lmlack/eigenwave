import { test } from "node:test";
import assert from "node:assert/strict";
import { fftFilter, peakFrequency, reconstruct, render, sampledSine, sampledSweep } from "../js/sound-math.js";
import { prepare, PEAK } from "../js/audio.js";

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test("a sine under half the sample rate comes back at its own frequency", () => {
  const y = reconstruct(sampledSine(1200, 4000, 0.5), 4000, 22050);
  near(peakFrequency(y, 22050), 1200, 15);
});

test("a sine over half the sample rate comes back as its alias", () => {
  // 3600 Hz sampled at 4000 per second looks like 400 Hz.
  const y = reconstruct(sampledSine(3600, 4000, 0.5), 4000, 22050);
  near(peakFrequency(y, 22050), 400, 15);
});

test("a sweep past half the sample rate folds back down", () => {
  const x = sampledSweep(200, 3800, 4000, 2);
  // Over the last 4% the true pitch runs 3656 to 3800 Hz, so the heard pitch runs 344 down to 200.
  const tail = x.slice(Math.round(x.length * 0.96));
  const y = reconstruct(tail, 4000, 22050);
  near(peakFrequency(y, 22050), 272, 80);
});

test("fftFilter removes what the gain zeroes", () => {
  const rate = 8000;
  const x = render((t) => Math.sin(2 * Math.PI * 300 * t) + Math.sin(2 * Math.PI * 2000 * t), 0.5, rate);
  const y = fftFilter(x, rate, (f) => (f < 1000 ? 1 : 0));
  near(peakFrequency(y, rate), 300, 10);
  // The 2 kHz tone is gone: what's left is close to the 300 Hz sine alone.
  const err = y.reduce((s, v, i) => s + (v - Math.sin((2 * Math.PI * 300 * i) / rate)) ** 2, 0) / y.length;
  assert.ok(err < 0.01, `err ${err}`);
});

test("sounds are scaled to a safe peak and faded at both ends", () => {
  const out = prepare(render((t) => 5 * Math.sin(2 * Math.PI * 440 * t), 0.2, 8000), 8000);
  const peak = Math.max(...out.map(Math.abs));
  near(peak, PEAK, 0.01);
  assert.equal(out[0], 0);
  near(out[out.length - 1], 0, 1e-9);
});
