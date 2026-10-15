// Lesson 23's math: where a sampled frequency lands, sinc reconstruction,
// and how fast a sampled wheel seems to spin.

/** The frequency a sine of f Hz looks like after sampling at fs: folded into −fs/2..fs/2. */
export const aliasOf = (f, fs) => f - fs * Math.round(f / fs);

export const sinc = (x) => (Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

/** Rebuild x(t) from samples v[n] taken at times n·T (n from n0): Σ v[n] sinc((t − nT)/T). */
export function sincRebuild(values, n0, T, t) {
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i] * sinc((t - (n0 + i) * T) / T);
  return s;
}

/**
 * A wheel with `spokes` identical spokes turning at rps revolutions a second,
 * filmed at fps frames a second, seems to turn at this many revolutions a
 * second. The pattern repeats every 1/spokes of a turn, so that's the
 * frequency that gets folded.
 */
export const apparentSpin = (rps, fps, spokes) => aliasOf(rps * spokes, fps) / spokes;
