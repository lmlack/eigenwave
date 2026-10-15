// Lesson 17: from series to transform. A pulse train's series coefficients,
// scaled by the period, sit on one fixed curve. Stretch the period and they
// crowd together until they fill it in: that curve is the Fourier transform of
// one pulse. Then Parseval: the energy is the same counted either way.

import { figure } from "../plot.js";
import { check, controls, el, fmt, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { pulseCoeff, pulseEnergy, pulseTransform } from "./fourier-math.js";

export function mount(root) {
  const narrow = window.matchMedia("(max-width: 640px)").matches; // phones get taller figures
  let T = 4, tau = 1, scaled = true, envelope = true, F = 3;

  root.append(prose(`
    <p>The Fourier series only works for signals that repeat. Most signals don't: a clap, a single pulse, a word. The trick is to pretend they repeat, with a period so long the copies never meet, and see what happens to the series as the period grows.</p>
    <p>Take a train of pulses, each ${inl("\\tau")} wide, one every ${inl("T")} seconds. Its harmonics sit at frequencies ${inl("k/T")}: whole multiples of one repeat per period. Stretch ${inl("T")} and they get closer together.</p>`));

  /* ---------- Time and frequency ---------- */
  const f1 = figure({ x: [-10, 10], y: [-0.3, 1.4], aspect: narrow ? 1.8 : 3, xTicks: 2, cap: "The pulse train in time. The shaded stretch is one period." });
  const p1 = f1.plot;
  p1.draw((p) => {
    p.rect(-T / 2, -0.3, T / 2, 1.4, { fill: p.c.raised, alpha: 0.7 });
    const pts = [];
    const n0 = Math.floor(-10 / T) - 1, n1 = Math.ceil(10 / T) + 1;
    pts.push([-10.5, 0]);
    for (let n = n0; n <= n1; n++) {
      const a = n * T - tau / 2, b = n * T + tau / 2;
      pts.push([a, 0], [a, 1], [b, 1], [b, 0]);
    }
    pts.push([10.5, 0]);
    p.path(pts, { color: p.c.blue, width: 2.5 });
  });

  const f2 = figure({ x: [-4, 4], y: [-0.6, 2.2], aspect: narrow ? 1.5 : 2.4, xTicks: 1, cap: "The harmonics, at frequencies k / T (in cycles per second, Hz). Dashed: τ sinc(f τ), the transform of a single pulse." });
  const p2 = f2.plot;
  p2.draw((p) => {
    if (envelope) p.fn((f) => pulseTransform(f, tau), { color: p.c.purple, width: 1.8, dash: [6, 5] });
    const fs = [], vs = [];
    const kmax = Math.ceil(4 * T);
    for (let k = -kmax; k <= kmax; k++) {
      fs.push(k / T);
      vs.push((scaled ? T : 1) * pulseCoeff(k, tau, T));
    }
    p.stems(fs, vs, { color: p.c.blue, r: T > 12 ? 2 : 3.5, width: T > 12 ? 1.2 : 1.6 });
  });

  const sT = slider({ label: "Period T", min: 1.5, max: 30, step: 0.1, value: T, format: (v) => `${fmt(v, 1)} s`, onInput: (v) => { T = v; update(); } });
  const sTau = slider({ label: "Pulse width τ", min: 0.1, max: 1.4, step: 0.02, value: tau, format: (v) => `${fmt(v, 2)} s`, onInput: (v) => { tau = v; update(); } });
  const cScale = check({ label: "Multiply the coefficients by T", checked: true, onChange: (v) => { scaled = v; update(); } });
  const cEnv = check({ label: "Show the transform of one pulse", checked: true, onChange: (v) => { envelope = v; p2.request(); } });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Stretch the period", f1.el, f2.el,
    legend([["--blue", "harmonics (T × c_k)"], ["--purple", "τ sinc(f τ)"]]),
    controls(sT.el, sTau.el, cScale.el, cEnv.el), status));

  root.append(tryIt([
    "Drag T from 4 up to 30. The stems crowd together, but they stay on the same dashed curve. In the limit there's a value at every frequency: that curve is the <strong>Fourier transform</strong>.",
    "Turn off “Multiply by T”. Now the stems shrink toward zero as T grows, because each harmonic's share of a mostly empty period gets smaller. Scaling by T is what keeps a finite answer.",
    "Make the pulse narrow (τ = 0.1). The curve gets wide and flat: its first zero is at 1/τ. A short event spreads over many frequencies, and a long one packs into a few.",
  ]));

  /* ---------- Parseval ---------- */
  root.append(prose(`
    <p>Energy doesn't care how you count it. The energy of one pulse is ${inl("\\int |x(t)|^2 dt = \\tau")} (height 1 squared, for ${inl("\\tau")} seconds). Count it in frequency instead, adding ${inl("|X(f)|^2")} across frequencies, and you get the same number. That's <b>Parseval's theorem</b>. It's the Pythagorean theorem for an orthogonal basis: the squared length of a vector is the sum of its squared coordinates.</p>`));
  const f3 = figure({ x: [0, 1.6], y: [-0.5, 2.5], aspect: narrow ? 2 : 3.4, grid: false, axes: false, cap: "Top: the pulse's energy, counted in time. Bottom: counted in frequency, up to ±F. The frequency count climbs toward the time count." });
  const p3 = f3.plot;
  p3.draw((p) => {
    const e = pulseEnergy(tau, T, Math.floor(F * T));
    const s = 1.1 / 1.4; // bar length per unit energy (τ ≤ 1.4)
    p.rect(0, 1.4, e.time * s, 2.2, { fill: p.c.blue });
    p.rect(0, 0.2, e.freq * s, 1.0, { fill: p.c.green });
    p.line(e.time * s, -0.2, e.time * s, 2.4, { color: p.c.fgSubtle, width: 1, dash: [3, 4] });
    p.text(`time: ${fmt(e.time, 3)}`, e.time * s, 1.8, { dx: 8, size: 12 });
    p.text(`frequency: ${fmt(e.freq, 3)} (${fmt((100 * e.freq) / e.time, 1)}%)`, Math.max(e.freq, e.time) * s, 0.6, { dx: 8, size: 12 });
  });
  const sF = slider({ label: "Count frequencies up to ±F", min: 0.1, max: 10, step: 0.1, value: F, format: (v) => `${fmt(v, 1)} Hz`, onInput: (v) => { F = v; update(); } });
  root.append(panel("Parseval: the same energy, counted twice", f3.el, controls(sF.el)));

  /* ---------- The math ---------- */
  const m = mathPanel([
    { tex: "c_k = \\frac{1}{T} \\int_{-T/2}^{T/2} x(t)\\, e^{-i 2\\pi k t / T}\\, dt = \\frac{\\tau}{T}\\, \\operatorname{sinc}\\!\\Big(\\frac{k\\tau}{T}\\Big)",
      note: `The series coefficient of harmonic ${inl("k")}, at frequency ${inl("f = k/T")}. ${inl("\\operatorname{sinc}(u) = \\sin(\\pi u)/(\\pi u)")}.` },
    { tex: "T\\, c_k = \\int_{-T/2}^{T/2} x(t)\\, e^{-i 2\\pi f t}\\, dt \\;\\Big|_{f = k/T} \\;\\longrightarrow\\; X(f) = \\int_{-\\infty}^{\\infty} x(t)\\, e^{-i 2\\pi f t}\\, dt",
      note: "Multiply by T and the 1/T goes away. What's left doesn't depend on T at all, except through where it's sampled. Let T grow and the samples cover every f: that's the Fourier transform X(f)." },
    { id: "now", tex: "" },
    { tex: "x(t) = \\sum_k \\underbrace{T c_k}_{X(k/T)}\\, e^{i 2\\pi (k/T) t}\\, \\underbrace{\\tfrac{1}{T}}_{\\Delta f} \\;\\longrightarrow\\; x(t) = \\int_{-\\infty}^{\\infty} X(f)\\, e^{i 2\\pi f t}\\, df",
      note: "Going back works the same way. The sum over harmonics, with spacing 1/T, becomes an integral over frequency." },
    { tex: "\\int_{-\\infty}^{\\infty} |x(t)|^2\\, dt = \\int_{-\\infty}^{\\infty} |X(f)|^2\\, df",
      note: "Parseval's theorem: the energy in time equals the energy in frequency." },
    { id: "parseval", tex: "" },
  ], [
    ["x(t)", "the signal: here a train of pulses, or one pulse"],
    ["T", "the period: time from one pulse to the next"],
    ["\\tau", "the width of each pulse"],
    ["k", "which harmonic"],
    ["c_k", "the Fourier series coefficient of harmonic k"],
    ["f", "frequency, in cycles per second (Hz)"],
    ["X(f)", "the Fourier transform: how much of frequency f the signal has"],
    ["\\operatorname{sinc}(u)", "sin(πu) / (πu), with sinc(0) = 1"],
    ["\\Delta f", "the spacing between harmonics, 1/T"],
    ["e^{i 2\\pi f t}", "a complex wave at frequency f"],
    ["F", "how far out in frequency the energy count goes"],
  ]);
  root.append(m.el);
  root.append(upNext("the same move for sampled signals: the DTFT, the DFT, and why a sine that doesn't fit the window leaks into its neighbors."));

  function update() {
    if (tau > T * 0.9) { tau = T * 0.9; sTau.set(tau); }
    status.textContent = `Harmonics every 1/T = ${fmt(1 / T, 3)} Hz. The curve first hits zero at 1/τ = ${fmt(1 / tau, 2)} Hz, so harmonics k = 1 to ${Math.max(0, Math.ceil(T / tau - 1e-9) - 1)} sit inside the middle hump.`;
    m.set("now", `T = ${num(T, 1)},\\ \\tau = ${num(tau, 2)}:\\quad \\Delta f = \\tfrac{1}{T} = ${num(1 / T, 3)},\\quad T c_1 = ${num(T * pulseCoeff(1, tau, T), 3)} = X(${num(1 / T, 3)})`);
    const e = pulseEnergy(tau, T, Math.floor(F * T));
    m.set("parseval", `\\tau = ${num(e.time, 3)} \\qquad \\sum_{|k/T| \\le ${num(F, 1)}} |T c_k|^2 \\cdot \\tfrac{1}{T} = ${num(e.freq, 3)}`);
    p1.request(); p2.request(); p3.request();
  }
  update();

  return { destroy() { p1.destroy(); p2.destroy(); p3.destroy(); } };
}
