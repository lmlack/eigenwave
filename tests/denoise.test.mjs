import { test } from "node:test";
import assert from "node:assert/strict";
import { denoise, makeNoisy, rmsError, N } from "../js/lessons/denoise-math.js";

test("keeping only the strong bins brings the signal much closer to the truth", () => {
  const { clean, noisy } = makeNoisy(1);
  const { cleaned, keep } = denoise(noisy, 10);
  assert.ok(rmsError(cleaned, clean) < rmsError(noisy, clean) / 4);
  // The two tones, each at +f and −f.
  assert.equal(keep.filter(Boolean).length, 4);
});

test("a threshold of zero keeps everything and changes nothing", () => {
  const { noisy } = makeNoisy(0.5);
  const { cleaned } = denoise(noisy, -1);
  for (let n = 0; n < N; n++) assert.ok(Math.abs(cleaned[n] - noisy[n]) < 1e-9);
});
