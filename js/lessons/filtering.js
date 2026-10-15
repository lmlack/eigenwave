// Lesson 20: convolution becomes multiplication. Pick a filter, drag its
// cutoffs on the spectrum, and watch the output. Then the same filter as an
// impulse response, applied by convolution in time, giving the same answer.

import { figure } from "../plot.js";
import { check, controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { listenButton, stopAll } from "../audio.js";
import { gaussian, mulberry32 } from "../cmath.js";
import { fftFilter, render } from "../sound-math.js";
import { FS, N, TONES, binGains, filterInFrequency, filterInTime, gain, impulseResponse, makeInput } from "./filtering-math.js";

export function mount(root) {
  // Phones get taller figures and fewer tick labels.
  const narrow = window.matchMedia("(max-width: 640px)").matches;
  const spec = { type: "low", shape: "ideal", f1: 12, f2: 32, order: 4 };
  let noise = 0.25;
  let input = makeInput(noise);
  let res = null, H = null, h = null, yTime = null;

  root.append(prose(`
    <p>A <b>filter</b> keeps some frequencies and throws others away. In time, a filter is a convolution: every output sample is a weighted sum of nearby input samples. That's lesson 13's sliding sum, and it's slow to think about.</p>
    <p>In frequency it's simple. Take the input's spectrum, multiply each frequency by how much the filter lets through, and transform back. Convolution in time is <b>multiplication</b> in frequency. That's the convolution theorem, and it's why engineers draw filters as shapes on a frequency axis.</p>`));

  /* ---------- Figure 1: the spectrum and the filter shape ---------- */
  const fSpec = figure({ x: [0, 64], y: [0, 1.15], aspect: narrow ? 1.6 : 2.4, xTicks: narrow ? 16 : 8, vAxis: false, xLabel: "Hz",
    cap: "The input's spectrum (blue), the filter's gain (orange) and what gets through (green). Drag the orange dots to move the cutoffs." });
  const ps = fSpec.plot;
  const spectrumMax = () => Math.max(...TONES.map(([, a]) => a)) * N / 2;
  ps.draw((p) => {
    const X = res.X, Y = res.Y, scale = 1 / spectrumMax();
    const ks = [], xs = [], ys = [];
    for (let k = 0; k <= 64; k++) { ks.push(k); xs.push(Math.hypot(X.re[k], X.im[k]) * scale); ys.push(Math.hypot(Y.re[k], Y.im[k]) * scale); }
    p.stems(ks, xs, { color: p.c.blue, r: 2.5, width: 1.4, alpha: 0.45 });
    p.stems(ks, ys, { color: p.c.green, r: 3, width: 2 });
    p.fn((f) => gain(f, spec), { color: p.c.accent, width: 2.5, from: 0, to: 64 });
  });
  const cutoffY = 1.06;
  ps.handle({ get: () => [spec.f1, cutoffY], set: (x) => { spec.f1 = clampCut(x, spec.type === "band" ? [1, spec.f2 - 2] : [1, 62]); update(); }, color: (c) => c.accent });
  ps.handle({ get: () => [spec.f2, cutoffY], set: (x) => { spec.f2 = clampCut(x, [spec.f1 + 2, 63]); update(); }, color: (c) => c.accent, visible: () => spec.type === "band" });
  const clampCut = (x, [a, b]) => Math.round(Math.max(a, Math.min(b, x)));

  /* ---------- Figure 2: input and output in time ---------- */
  const fTime = figure({ x: [0, 1], y: [-2.6, 2.6], aspect: narrow ? 1.7 : 2.6, xTicks: narrow ? 0.2 : 0.1, vAxis: false, xLabel: "s",
    cap: "One second of the input (faint blue) and the filtered output (green)." });
  const pt = fTime.plot;
  let showClean = false;
  pt.draw((p) => {
    const pts = (arr) => Array.from(arr, (v, n) => [input.t[n], v]);
    p.path(pts(input.x), { color: p.c.blue, width: 1.4, alpha: 0.4 });
    if (showClean) p.path(pts(input.clean), { color: p.c.fgSubtle, width: 1.4, dash: [4, 4] });
    p.path(pts(res.y), { color: p.c.green, width: 2.2 });
  });

  const type = segmented({ label: "Filter type", value: spec.type, options: [["low", "Low-pass"], ["high", "High-pass"], ["band", "Band-pass"]],
    onChange: (v) => {
      spec.type = v;
      if (v === "high") spec.f1 = 30;
      if (v === "low") spec.f1 = 12;
      if (v === "band") { spec.f1 = 14; spec.f2 = 30; }
      update();
    } });
  const shape = segmented({ label: "Filter shape", value: spec.shape, options: [["ideal", "Brick wall"], ["smooth", "Smooth"]],
    onChange: (v) => { spec.shape = v; update(); } });
  const sNoise = slider({ label: "Noise", min: 0, max: 0.8, step: 0.05, value: noise, onInput: (v) => { noise = v; input = makeInput(noise); update(); } });
  const cClean = check({ label: "Show the three sines without noise", onChange: (v) => { showClean = v; pt.request(); } });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  // Sounds are 20 times higher than the plots: the 5, 20 and 45 Hz sines play
  // at 100, 400 and 900 Hz. At 5,120 samples a second the noise covers the
  // same range, relative to the tones, as on screen.
  const HEAR = 20, RATE = FS * HEAR, SECS = 2;
  const noisyInput = () => {
    const g = gaussian(mulberry32(11));
    return render((tt) => TONES.reduce((sum, [fr, a]) => sum + a * Math.sin(2 * Math.PI * fr * HEAR * tt), 0) + noise * g(), SECS, RATE);
  };
  const hearIn = listenButton("Input", () => ({ samples: noisyInput(), rate: RATE }));
  const hearOut = listenButton("Filtered", () => ({ samples: fftFilter(noisyInput(), RATE, (fr) => gain(fr / HEAR, spec)), rate: RATE }), "solid");

  root.append(panel("Shape the spectrum",
    fSpec.el,
    legend([["--blue", "input spectrum"], ["--accent", "filter gain H"], ["--green", "output spectrum"]]),
    el("div", { class: "btn-row", style: "margin-top:12px" }, type.el, shape.el),
    fTime.el,
    legend([["--blue", "input"], ["--green", "output"]]),
    controls(sNoise.el, cClean.el),
    status,
    el("div", { class: "btn-row", style: "margin-top:12px" }, hearIn.el, hearOut.el),
    el("p", { class: "small subtle", style: "margin:6px 0 0", text: "Sounds are 20 times higher than the plots. The input is three notes under a hiss; the filtered sound keeps only what the orange shape lets through." })));

  root.append(tryIt([
    "Low-pass at 12 Hz keeps only the 5 Hz sine. The output is a clean slow wave, and the noise is mostly gone with the high frequencies.",
    "Switch to high-pass and drag the cutoff to 30 Hz: only the fast 45 Hz sine and the high-frequency noise are left.",
    "Pick band-pass and drag both dots around 20 Hz to pull out the middle sine on its own.",
    "Play Input, then Filtered with a low-pass at 12 Hz: the hiss and the two higher notes drop away, leaving one low hum.",
    "Flip between Brick wall and Smooth with the noise at zero. The smooth filter lets a little of the neighbors through, but its impulse response below is much shorter.",
  ]));

  /* ---------- Figure 3: the impulse response, and convolution ---------- */
  root.append(prose(`
    <p>Every filter shaped like this has an <b>impulse response</b> ${inl("h[n]")}: what comes out when the input is a single impulse. Transform the gain ${inl("H")} back to time and you get it. Convolving the input with ${inl("h")} gives exactly the same output as multiplying spectra. The check below compares the two, sample by sample.</p>
    <p>A brick wall in frequency is a long ripple in time. Its ${inl("h")} is a sinc that rings on and on, and a sudden change in the input makes the output ring too. A smooth edge in frequency gives a short ${inl("h")}. Sharp in one domain means spread out in the other: you'll meet that again in the spectrogram lesson.</p>`));

  const fImp = figure({ x: [-40, 40], y: [-0.15, 0.3], aspect: narrow ? 1.7 : 2.6, xTicks: narrow ? 20 : 10, vAxis: false, pad: { l: 48 },
    cap: "The impulse response h[n], centered on n = 0. It's the filter, written in time." });
  const pi = fImp.plot;
  pi.draw((p) => {
    const ns = [], vs = [];
    for (let n = -40; n <= 40; n++) { ns.push(n); vs.push(h[(n + N) % N]); }
    const peak = Math.max(...vs.map(Math.abs)) || 1;
    if (Math.abs(p.y1 - peak * 1.2) > 1e-6) p.setRange(null, [-peak * 0.6, peak * 1.2]);
    p.stems(ns, vs, { color: p.c.purple, r: 2.5, width: 1.5 });
  });
  const matchLine = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("The same filter, in time", fImp.el, matchLine));

  const m = mathPanel([
    { tex: "y[n] = (h * x)[n] = \\sum_{m} h[m]\\, x[n - m]", note: "Filtering in time: each output sample is a weighted sum of input samples, with weights h." },
    { tex: "Y[k] = H[k]\\, X[k]", note: "The same thing in frequency: multiply, one frequency at a time. Here the transforms are 256-point DFTs, so the convolution is circular." },
    { id: "gains", tex: "" },
    { tex: "h[n] = \\frac{1}{N} \\sum_{k=0}^{N-1} H[k]\\, e^{2\\pi i k n / N}", note: "The impulse response is the inverse transform of the gains." },
    { tex: "H_\\text{smooth}(f) = \\frac{1}{\\sqrt{1 + (f / f_c)^{2p}}}", note: `The smooth low-pass: gain ${inl("1/\\sqrt{2}")} at the cutoff, falling off faster for bigger ${inl("p")}. Here ${inl("p = 4")}. High-pass flips ${inl("f / f_c")} to ${inl("f_c / f")}, and band-pass is one times the other.` },
    { id: "check", tex: "" },
  ], [
    ["x[n],\\ y[n]", "the input and output samples"],
    ["h[n]", "the impulse response: the output for a single impulse in"],
    ["*", "convolution"],
    ["X[k],\\ Y[k]", "the DFTs of the input and output: how much of frequency k each has"],
    ["H[k]", "the filter's gain at frequency k: 1 lets it through, 0 removes it"],
    ["k", "frequency index; with one second of samples, bin k is k Hz"],
    ["N", `number of samples, ${N}`],
    ["f,\\ f_c", "a frequency, and the cutoff frequency, in Hz"],
    ["p", "the smooth filter's order: how steep its edge is"],
  ]);
  root.append(m.el);
  root.append(upNext("using the same trick to clean noise off a signal: keep only the frequencies that stand out."));

  function update() {
    H = binGains(spec);
    res = filterInFrequency(input.x, H);
    h = impulseResponse(H);
    yTime = filterInTime(input.x, h);
    let diff = 0;
    for (let n = 0; n < N; n++) diff = Math.max(diff, Math.abs(yTime[n] - res.y[n]));
    const kept = TONES.filter(([f]) => gain(f, spec) > 0.5).map(([f]) => `${f} Hz`);
    status.textContent = kept.length
      ? `Getting through: ${kept.join(", ")}${kept.length < TONES.length ? `. Blocked: ${TONES.filter(([f]) => gain(f, spec) <= 0.5).map(([f]) => `${f} Hz`).join(", ")}.` : "."}`
      : "Nothing gets through: all three sines are blocked.";
    matchLine.textContent = `Largest difference between the two ways of filtering: ${diff.toExponential(1)}. That's rounding error: they're the same output.`;
    const g = (f) => num(gain(f, spec), 2);
    const cut = spec.type === "band" ? `f_1 = ${spec.f1},\\ f_2 = ${spec.f2}` : `f_c = ${spec.f1}`;
    m.set("gains", `${cut}\\ \\text{Hz}:\\quad H(5) = ${g(5)},\\ \\ H(20) = ${g(20)},\\ \\ H(45) = ${g(45)}`);
    m.set("check", `\\max_n \\big|\\, (h * x)[n] - \\text{IDFT}(H X)[n] \\,\\big| = ${num(diff, 2)}`);
    ps.request(); pt.request(); pi.request();
  }
  update();

  return { destroy() { stopAll(); ps.destroy(); pt.destroy(); pi.destroy(); } };
}
