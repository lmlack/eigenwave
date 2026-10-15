// Lesson 21: cleaning a signal with the FFT. Two tones under noise; drag a
// threshold across the power spectrum, keep what clears it, transform back.

import { figure } from "../plot.js";
import { button, check, controls, el, fmt, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { FS, N, TONES, denoise, makeNoisy, rmsError } from "./denoise-math.js";
import { listenButton, stopAll } from "../audio.js";
import { gaussian, mulberry32 } from "../cmath.js";

export function mount(root) {
  // Phones get taller figures and fewer tick labels.
  const narrow = window.matchMedia("(max-width: 640px)").matches;
  let sigma = 1, seed = 7, thr = 10;
  let sig = makeNoisy(sigma, seed);
  let res = denoise(sig.noisy, thr);

  root.append(prose(`
    <p>Here's a signal that's mostly noise: two steady tones, at 12 Hz and 31 Hz, buried under random jitter. In time it looks like a mess. You can't see the tones at all.</p>
    <p>In frequency it's a different picture. Each tone puts all its energy into one frequency, so it sticks up as a tall spike. The noise spreads its energy thinly over every frequency, so it's a low, even floor. Draw a line between the spikes and the floor, keep only what's above it, and transform back. That's FFT denoising, and it works because the signal and the noise look so different in frequency.</p>`));

  /* ---------- Figure 1: the power spectrum and the threshold ---------- */
  const fP = figure({ x: [0, 128], y: [0, 80], aspect: narrow ? 1.6 : 2.4, xTicks: narrow ? 32 : 16, vAxis: false, xLabel: "Hz",
    cap: "Power at each frequency, 0 to 128 Hz. Drag the orange dot up or down to move the threshold. Green bins are kept." });
  const pp = fP.plot;
  pp.draw((p) => {
    const ks = [], ps = [], kk = [], kp = [];
    for (let k = 0; k <= N / 2; k++) {
      const v = Math.min(res.P[k], p.y1 * 0.98);
      if (res.keep[k]) { kk.push((k * FS) / N); kp.push(v); } else { ks.push((k * FS) / N); ps.push(v); }
    }
    p.stems(ks, ps, { color: p.c.blue, r: 0, width: 2, alpha: 0.6 });
    p.stems(kk, kp, { color: p.c.green, r: 3, width: 3 });
    p.line(0, thr, 128, thr, { color: p.c.accent, width: 2, dash: [6, 5] });
  });
  pp.handle({ get: () => [118, thr], set: (x, y) => { thr = Math.max(0.2, Math.min(78, y)); sThr.set(thr); recompute(); }, color: (c) => c.accent });

  /* ---------- Figure 2: the signals ---------- */
  const fT = figure({ x: [0, 0.5], y: [-4, 4], aspect: narrow ? 1.7 : 2.6, xTicks: narrow ? 0.1 : 0.05, vAxis: false, xLabel: "s",
    cap: "Half a second: the noisy signal (faint blue), the cleaned one (orange) and the true tones (dashed)." });
  const pt = fT.plot;
  let showTruth = true;
  pt.draw((p) => {
    const half = N / 2 + 1;
    const pts = (arr) => Array.from({ length: half }, (_, n) => [sig.t[n], arr[n]]);
    p.path(pts(sig.noisy), { color: p.c.blue, width: 1.3, alpha: 0.45 });
    if (showTruth) p.path(pts(sig.clean), { color: p.c.fg, width: 1.6, dash: [5, 4], alpha: 0.7 });
    p.path(pts(res.cleaned), { color: p.c.accent, width: 2.3 });
  });

  const sThr = slider({ label: "Threshold (power)", min: 0.2, max: 78, step: 0.2, value: thr, format: (v) => fmt(v, 1), onInput: (v) => { thr = v; recompute(); } });
  const sNoise = slider({ label: "Noise level σ", min: 0, max: 3, step: 0.05, value: sigma, onInput: (v) => { sigma = v; regen(); } });
  const cTruth = check({ label: "Show the true tones", checked: true, onChange: (v) => { showTruth = v; pt.request(); } });
  const newNoise = button("New noise", () => { seed++; regen(); });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  // Two seconds of sound, 20 times higher than the plot (12 and 31 Hz play at
  // 240 and 620 Hz). It's cleaned in blocks of N samples, the same size as
  // the figure, so the threshold you set means exactly the same thing.
  const HEAR = 20, RATE = FS * HEAR, BLOCKS = 40;
  function noisyAudio() {
    const g = gaussian(mulberry32(seed + 100));
    return Float64Array.from({ length: N * BLOCKS }, (_, n) =>
      TONES.reduce((sum, [fr, a]) => sum + a * Math.sin((2 * Math.PI * fr * n) / FS), 0) + sigma * g());
  }
  function cleanedAudio() {
    const x = noisyAudio(), out = new Float64Array(x.length);
    for (let b = 0; b < BLOCKS; b++) out.set(denoise(x.subarray(b * N, (b + 1) * N), thr).cleaned, b * N);
    return out;
  }
  const hearNoisy = listenButton("Noisy", () => ({ samples: noisyAudio(), rate: RATE }));
  const hearClean = listenButton("Cleaned", () => ({ samples: cleanedAudio(), rate: RATE }), "solid");

  root.append(panel("Keep what stands out",
    fP.el,
    legend([["--blue", "removed bins"], ["--green", "kept bins"], ["--accent", "threshold"]]),
    fT.el,
    legend([["--blue", "noisy"], ["--accent", "cleaned"], ["--fg", "true tones"]]),
    controls(sThr.el, sNoise.el, el("div", { class: "btn-row" }, cTruth.el, newNoise)),
    status,
    el("div", { class: "btn-row", style: "margin-top:12px" }, hearNoisy.el, hearClean.el),
    el("p", { class: "small subtle", style: "margin:6px 0 0", text: "Sounds are 20 times higher than the plot. Noisy is two notes buried in hiss; Cleaned keeps only the bins above your threshold." })));

  root.append(tryIt([
    "Start with the threshold around 10. Only four bins clear it: each tone at its frequency, plus its mirror image. The orange line lands almost on the dashed truth.",
    "Drag the threshold right down to the floor. Noise bins sneak in and the cleaned signal gets jittery again.",
    "Drag it above the smaller spike. The 31 Hz tone gets thrown out with the noise, and you're left with one clean sine.",
    "Play Noisy, then Cleaned with the threshold around 10: the hiss disappears and two clear notes are left. Drop the threshold to the floor and play Cleaned again: the hiss creeps back.",
    "Turn the noise up to 3. The floor rises toward the spikes, and there's no line that keeps the tones without keeping noise.",
  ]));

  const m = mathPanel([
    { tex: "x[n] = s[n] + \\text{noise}[n]", note: "What we measure: the signal we want plus noise." },
    { tex: "P[k] = \\frac{|X[k]|^2}{N}", note: "The power at frequency k, from the DFT of the measurement." },
    { tex: "\\hat X[k] = \\begin{cases} X[k] & P[k] > \\tau \\\\ 0 & \\text{otherwise} \\end{cases}", note: "Keep each bin whose power clears the threshold; zero the rest." },
    { tex: "\\hat s[n] = \\frac{1}{N} \\sum_{k=0}^{N-1} \\hat X[k]\\, e^{2\\pi i k n/N}", note: "Transform back. Because a real signal's bins come in mirror pairs, both copies clear the threshold together, so the result stays real." },
    { id: "counts", tex: "" },
    { id: "err", tex: "" },
    { html: `The noise floor sits around ${inl("\\sigma^2")}: white noise spreads its power ${inl("\\sigma^2")} evenly over all ${inl("N")} bins. A tone of amplitude ${inl("A")} puts ${inl("N A^2 / 4")} in each of its two bins. That gap is what the threshold uses.` },
  ], [
    ["x[n]", "the noisy measurement, sample n"],
    ["s[n],\\ \\hat s[n]", "the true signal, and our cleaned estimate of it"],
    ["X[k],\\ \\hat X[k]", "the DFT of the measurement, and the same with weak bins zeroed"],
    ["P[k]", "the power in frequency bin k"],
    ["\\tau", "the threshold you drag"],
    ["N", `number of samples, ${N} (one second at ${FS} samples a second, so bin k is k Hz)`],
    ["\\sigma", "the noise's standard deviation: how big the jitter is"],
    ["A", "a tone's amplitude"],
    ["\\text{RMS}", "root-mean-square error: the typical size of the difference from the truth"],
  ]);
  root.append(m.el);
  root.append(upNext("the spectrogram. One spectrum for a whole signal hides <i>when</i> each frequency happens. Taking spectra of short pieces shows it."));

  function regen() {
    sig = makeNoisy(sigma, seed);
    recompute();
  }
  function recompute() {
    res = denoise(sig.noisy, thr);
    const kept = res.keep.filter(Boolean).length;
    const eN = rmsError(sig.noisy, sig.clean), eC = rmsError(res.cleaned, sig.clean);
    const tonesKept = TONES.filter(([f]) => res.keep[f]).map(([f]) => `${f} Hz`);
    status.textContent = `Keeping ${kept} of ${N} bins (${tonesKept.length ? tonesKept.join(" and ") : "neither tone"}). Error against the truth: ${fmt(eN, 2)} before, ${fmt(eC, 2)} after.`;
    m.set("counts", `\\tau = ${num(thr, 1)}:\\quad ${kept} \\text{ of } ${N} \\text{ bins kept}`);
    m.set("err", `\\text{RMS}(x - s) = ${num(eN, 3)},\\qquad \\text{RMS}(\\hat s - s) = ${num(eC, 3)}`);
    pp.request(); pt.request();
  }
  recompute();

  return { destroy() { stopAll(); pp.destroy(); pt.destroy(); } };
}
