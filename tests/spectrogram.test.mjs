import { test } from "node:test";
import assert from "node:assert/strict";
import { FS, gaussianWidths, preset, stft } from "../js/lessons/spectrogram-math.js";

test("the STFT of the 'turns' sound peaks at 180 Hz, then 330 Hz", () => {
  const s = stft(preset("turns"), 128, 32);
  const peak = (f) => {
    let best = 0;
    for (let k = 1; k < s.bins; k++) if (s.db[f * s.bins + k] > s.db[f * s.bins + best]) best = k;
    return s.freq(best);
  };
  const at = (time) => peak(Math.round((time * FS - 64) / 32));
  assert.ok(Math.abs(at(0.12) - 180) <= FS / 128);
  assert.ok(Math.abs(at(0.37) - 330) <= FS / 128);
});

test("a Gaussian's widths multiply to 1/(4π), whatever its width", () => {
  for (const sigma of [0.01, 0.03, 0.1]) {
    const { st, sf } = gaussianWidths(sigma);
    assert.ok(Math.abs(st * sf - 1 / (4 * Math.PI)) < 1e-3, `${sigma}: ${st * sf}`);
  }
});

test("every preset is the right length and finite", () => {
  for (const p of ["chirp", "turns", "click", "melody"]) {
    const x = preset(p);
    assert.equal(x.length, FS * 2);
    assert.ok(x.every(Number.isFinite));
  }
});
