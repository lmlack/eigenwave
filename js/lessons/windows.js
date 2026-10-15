// Lesson 18: DTFT, DFT and leakage. The DFT samples a continuous curve, the
// DTFT. A sine that fits the window lands every sample on a zero but one; a
// sine that doesn't leaks into every bin. Windows trade a wider peak for much
// lower leakage, and zero padding draws the curve more finely without adding
// any resolution.

import { figure } from "../plot.js";
import { check, controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { WINDOWS } from "../cmath.js";
import { paddedMag, windowLobes } from "./fourier-math.js";

const N = 32;
const L = 4096; // padding for the smooth DTFT curve
const WIN_NAMES = { rect: "Rectangular (none)", hann: "Hann", hamming: "Hamming", blackman: "Blackman" };

export function mount(root) {
  const narrow = window.matchMedia("(max-width: 640px)").matches; // phones get taller figures
  let f0 = 4.5, win = "rect", pad = 1, db = true, second = false, gap = 3, weak = false;
  const lobes = Object.fromEntries(Object.keys(WINDOWS).map((k) => [k, windowLobes(Array.from({ length: N }, (_, n) => WINDOWS[k](n, N)))]));

  root.append(prose(`
    <p>A computer can't hold a signal forever. It takes ${inl("N")} samples and stops. The <b>DTFT</b> (discrete-time Fourier transform) of those samples is a smooth curve: how much of every frequency they hold. The <b>DFT</b> (discrete Fourier transform) keeps just ${inl("N")} points of that curve, at whole numbers of cycles per window. Those ${inl("N")} points are all the computer ever sees.</p>
    <p>If a sine fits the window exactly, a whole number of cycles, every DFT point but one lands on a zero of the curve, and you see one clean spike. If it doesn't fit, the points land on the curve's slopes and ripples instead, and the sine seems to spread into every bin. That spreading is called <b>leakage</b>.</p>`));

  const signalAt = () => Array.from({ length: N }, (_, n) => {
    let v = Math.cos((2 * Math.PI * f0 * n) / N);
    if (second) v += (weak ? 0.01 : 1) * Math.cos((2 * Math.PI * (f0 + gap) * n) / N + 0.7);
    return v;
  });
  const winAt = () => Array.from({ length: N }, (_, n) => WINDOWS[win](n, N));

  /* ---------- Time ---------- */
  const f1 = figure({ x: [-0.7, 31.7], y: [-2.2, 2.2], aspect: narrow ? 1.8 : 3, xTicks: 4, vAxis: false, cap: `${N} samples. Faint: the signal. Solid: the signal times the window. Gold: the window.` });
  const p1 = f1.plot;
  p1.draw((p) => {
    const x = signalAt(), w = winAt();
    const ns = x.map((_, i) => i);
    p.fn((t) => Math.cos((2 * Math.PI * f0 * t) / N) + (second ? (weak ? 0.01 : 1) * Math.cos((2 * Math.PI * (f0 + gap) * t) / N + 0.7) : 0),
      { from: 0, to: N - 1, color: p.c.fgSubtle, width: 1, alpha: 0.6 });
    if (win !== "rect") p.path(ns.map((n) => [n, w[n] * (second && !weak ? 2 : 1)]), { color: p.c.gold, width: 1.8, dash: [5, 4] });
    p.stems(ns, x.map((v, i) => v * w[i]), { color: p.c.blue, r: 3 });
  });

  /* ---------- Spectrum ---------- */
  const f2 = figure({ x: [0, N / 2], y: [-90, 5], aspect: narrow ? 1.3 : 2.2, xTicks: 2, cap: "Frequency in cycles per window (DFT bins). Line: the DTFT. Orange dots: the DFT. Green dots: extra samples from zero padding." });
  const p2 = f2.plot;
  p2.draw((p) => {
    const x = signalAt(), w = winAt();
    const xw = x.map((v, i) => v * w[i]);
    const ref = w.reduce((s, v) => s + v, 0) / 2; // a bin-centered cosine of height 1 reads 1 (0 dB)
    const val = (m) => (db ? 20 * Math.log10(Math.max(m / ref, 1e-6)) : m / ref);
    const dense = paddedMag(xw, L);
    const step = L / N;
    p.path(Array.from({ length: L / 2 + 1 }, (_, i) => [i / step, Math.max(p.vy0, val(dense[i]))]), { color: p.c.blue, width: 1.8 });
    // True frequencies.
    for (const f of second ? [f0, f0 + gap] : [f0]) p.line(f, p.vy0, f, p.vy1, { color: p.c.fgSubtle, width: 1, dash: [3, 4] });
    if (pad > 1) {
      const ks = [], vs = [];
      for (let j = 0; j <= (N * pad) / 2; j++) if (j % pad) { ks.push(j / pad); vs.push(val(dense[(j * L) / (N * pad)])); }
      dots(p, ks, vs, p.c.green, 3.5);
    }
    const ks = Array.from({ length: N / 2 + 1 }, (_, k) => k);
    dots(p, ks, ks.map((k) => val(dense[k * step])), p.c.accent, 5);
  });
  function dots(p, xs, ys, color, r) {
    // A bin that's exactly zero would be −∞ dB: pin it to the bottom edge so it still shows.
    xs.forEach((x, i) => p.dot(x, Math.max(ys[i], p.vy0 + 1e-3 * (p.vy1 - p.vy0)), { r, color }));
  }

  const sF = slider({ label: "Frequency f₀ (cycles per window)", min: 1, max: 10, step: 0.05, value: f0, format: (v) => fmt(v, 2), onInput: (v) => { f0 = v; update(); } });
  const sWin = segmented({ label: "Window", options: [["rect", "Rect"], ["hann", "Hann"], ["hamming", "Hamming"], ["blackman", "Blackman"]], value: win, onChange: (v) => { win = v; update(); } });
  const sPad = segmented({ label: "Zero padding", options: [[1, "none"], [2, "2×"], [4, "4×"], [8, "8×"]], value: pad, onChange: (v) => { pad = v; update(); } });
  const sScale = segmented({ label: "Scale", options: [[true, "dB"], [false, "linear"]], value: db, onChange: (v) => { db = v; p2.setRange(null, db ? [-90, 5] : [-0.05, 1.15]); update(); } });
  const cSecond = check({ label: "Add a second sine", onChange: (v) => { second = v; update(); } });
  const sGap = slider({ label: "Second sine is this many bins higher", min: 0.5, max: 6, step: 0.1, value: gap, format: (v) => fmt(v, 1), onInput: (v) => { gap = v; update(); } });
  const cWeak = check({ label: "Make it 100× weaker (−40 dB)", onChange: (v) => { weak = v; update(); } });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  const lbl = (t, c) => el("div", { class: "ctl" }, el("span", { class: "lbl", text: t }), c);

  root.append(panel("A sine through the DFT", f1.el, f2.el,
    legend([["--blue", "DTFT (smooth curve)"], ["--accent", "DFT bins"], ["--green", "zero-padded samples"], ["--gold", "window"]]),
    controls(sF.el, lbl("Scale", sScale.el)),
    controls(lbl("Window", sWin.el), lbl("Zero padding", sPad.el)),
    controls(cSecond.el, sGap.el, cWeak.el),
    status));

  root.append(tryIt([
    "Set f₀ to 4.00. Every orange dot but one sits at the bottom: a clean spike. Now 4.50: the dots climb the curve's side lobes, and every bin gets some.",
    "At 4.50, switch the window from Rect to Hann. The side lobes drop from about −13 dB to −31 dB, but the main peak gets twice as wide.",
    "Turn on zero padding 8×. The green dots trace the curve more finely, but the curve itself doesn't change. Padding interpolates; it doesn't add resolution.",
    "Add a second sine, 100× weaker, 3 bins up. With no window it's buried under the first sine's side lobes. With Blackman it stands out.",
  ]));

  /* ---------- The math ---------- */
  const m = mathPanel([
    { tex: "X(e^{i\\omega}) = \\sum_{n=0}^{N-1} x[n]\\, e^{-i\\omega n}",
      note: "The DTFT of the N samples: defined for every frequency ω, and it repeats every 2π." },
    { tex: "X[k] = \\sum_{n=0}^{N-1} x[n]\\, e^{-i 2\\pi k n / N} = X(e^{i\\omega})\\Big|_{\\omega = 2\\pi k/N}",
      note: "The DFT is the DTFT sampled at N evenly spaced frequencies, k whole cycles per window." },
    { id: "where", tex: "" },
    { tex: "x_w[n] = w[n]\\, x[n] \\quad\\Longrightarrow\\quad X_w(e^{i\\omega}) = \\frac{1}{2\\pi} \\int_{-\\pi}^{\\pi} X(e^{i\\theta})\\, W(e^{i(\\omega - \\theta)})\\, d\\theta",
      note: "Multiplying by a window in time smears the spectrum by the window's own spectrum W. Cutting off after N samples is already a window, the rectangular one, so there's always some smearing." },
    { tex: "w_{\\text{Hann}}[n] = \\tfrac12 - \\tfrac12 \\cos\\!\\Big(\\frac{2\\pi n}{N-1}\\Big)",
      note: "Hann tapers to zero at both ends, so the cut-off isn't a sudden jump. Fewer jumps, lower side lobes: the same story as the Gibbs ripples." },
    { id: "win", tex: "" },
    { tex: "\\text{zero padding: } x[0], \\dots, x[N-1], \\underbrace{0, \\dots, 0}_{(P-1)N} \\;\\Longrightarrow\\; X[k] \\text{ at } \\omega = \\frac{2\\pi k}{PN}",
      note: "Same DTFT, sampled P times more densely. Two sines closer than the main lobe stay blurred together, however much you pad." },
  ], [
    ["x[n]", "the samples, n = 0 to N − 1"],
    ["N", `how many samples are kept (${N} here)`],
    ["\\omega", "frequency in radians per sample"],
    ["X(e^{i\\omega})", "the DTFT: a smooth curve over all frequencies"],
    ["X[k]", "the DFT: the DTFT at ω = 2πk/N"],
    ["k", "the bin: whole cycles per window"],
    ["f_0", "the sine's frequency in cycles per window (not always whole)"],
    ["w[n],\\ W", "the window, and its spectrum"],
    ["x_w[n]", "the samples times the window"],
    ["P", "the zero-padding factor"],
    ["\\text{dB}", "decibels: 20 log₁₀ of a ratio of sizes. −20 dB is 10× smaller, −40 dB is 100× smaller"],
  ]);
  root.append(m.el);
  root.append(upNext("the FFT: the same DFT, computed in N log N steps instead of N² by splitting it in half again and again."));

  function update() {
    const lo = Math.floor(f0), frac = f0 - lo;
    status.textContent = Math.abs(frac) < 1e-9
      ? `f₀ = ${fmt(f0, 2)}: a whole number of cycles. With the rectangular window, every other bin is exactly zero.`
      : `f₀ = ${fmt(f0, 2)} sits ${fmt(frac, 2)} of the way from bin ${lo} to bin ${lo + 1}. It leaks into every bin.`;
    m.set("where", `f_0 = ${num(f0, 2)}:\\quad \\text{nearest bins } k = ${lo}, ${lo + 1}`);
    const L0 = lobes[win];
    m.set("win", `\\text{${WIN_NAMES[win].replace(" (none)", "")}}:\\quad \\text{highest side lobe} = ${num(L0.sideDb, 1)}\\,\\text{dB},\\quad \\text{main lobe} = ${num(L0.mainWidth, 1)}\\ \\text{bins wide}`);
    sGap.el.style.opacity = second ? "" : "0.5";
    cWeak.el.style.opacity = second ? "" : "0.5";
    p1.request(); p2.request();
  }
  update();

  return { destroy() { p1.destroy(); p2.destroy(); } };
}
