// Lesson 26: the z-transform and the unit circle. Drag z and see zⁿ; build
// a digital filter from poles and zeros and see that its frequency response
// is |H(z)| read around the unit circle; then the bridge z = e^{sT} that
// carries the s-plane onto the z-plane, wrapping the iω axis round the circle.

import { animate, figure } from "../plot.js";
import { button, check, controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { listenButton, stopAll } from "../audio.js";
import { cabs, carg, cis } from "../cmath.js";
import { Hz, impulseZ, powZReal, sToZ, stableZ, withConjugates } from "./transforms-math.js";
import { heatmap, poleMark, zeroMark } from "./heatmap.js";

const narrow = window.matchMedia("(max-width: 640px)").matches;
const NN = 30;

export function mount(root) {
  const plots = [];
  const anims = [];

  root.append(prose(`
    <p>Lesson 11 showed that the powers ${inl("z^n")} of one complex number ${inl("z = r\\,e^{i\\theta}")} spiral in when ${inl("z")} is inside the unit circle, go steadily round when it's on the circle, and spiral out when it's outside. The <b>z-transform</b> uses exactly those signals as its building blocks. It's the Laplace transform's twin for sampled signals.</p>
    <p>Every ${inl("z")} is a point in the <b>z-plane</b>. Its distance ${inl("r")} from the center plays the part of ${inl("\\sigma")} (grow or decay), and its angle ${inl("\\theta")} plays the part of ${inl("\\omega")} (how fast it turns per sample).</p>`));

  /* ---------- Figure 1: z and zⁿ ---------- */
  const z = [0.9 * Math.cos(0.5), 0.9 * Math.sin(0.5)];
  const f1 = figure({ x: [-1.6, 1.6], y: [-1.6, 1.6], equal: true, aspect: 1, xLabel: "Re", yLabel: "Im", cap: "The z-plane. Drag z. The dots are 1, z, z², …" });
  const f2 = figure({ x: [-0.6, NN + 0.6], y: [-2.2, 2.2], aspect: 1.5, vAxis: false, xLabel: "n", cap: "The real part of zⁿ = rⁿ cos(θn)." });
  const p1 = f1.plot, p2 = f2.plot;
  plots.push(p1, p2);
  p1.draw((p) => {
    // Inside the circle, faintly shaded: where zⁿ dies out.
    p.ctx.save(); p.ctx.globalAlpha = 0.08; p.circle(0, 0, 1, { fill: p.c.green, width: 0 }); p.ctx.restore();
    p.circle(0, 0, 1, { color: p.c.blue, width: 2.5 });
    const r = cabs(z), th = carg(z);
    const pts = [];
    for (let n = 0; n <= 14; n++) {
      const m = r ** n;
      if (m > 3) break;
      pts.push([m * Math.cos(th * n), m * Math.sin(th * n)]);
    }
    p.path(pts, { color: p.c.purple, width: 1.2, alpha: 0.6 });
    for (const [x, y] of pts) p.dot(x, y, { r: 3, color: p.c.purple });
    p.text("unit circle", 0.72, -0.72, { color: p.c.blue, size: 12, dx: 8, dy: 8 });
  });
  p1.handle({
    get: () => z, color: (c) => c.accent, label: "z",
    set: (x, y) => {
      let r = Math.min(1.5, Math.hypot(x, y));
      if (Math.abs(r - 1) < 0.03) r = 1; // easy to land exactly on the circle
      const th = Math.atan2(y, x);
      z[0] = r * Math.cos(th); z[1] = r * Math.sin(th);
      update();
    },
  });
  p2.draw((p) => {
    const ns = Array.from({ length: NN + 1 }, (_, n) => n);
    p.stems(ns, ns.map((n) => Math.max(-2.2, Math.min(2.2, powZReal(z, n)))), { color: p.c.purple });
  });
  const read1 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Every point is a sampled signal", el("div", { class: "fig-row" }, f1.el, f2.el), read1));

  /* ---------- Figure 2: H(z), the unit circle slice ---------- */
  root.append(prose(`
    <p>A digital filter has a transfer function ${inl("H(z)")}, again a fraction with <b>poles</b> and <b>zeros</b>. And again its frequency response is a slice of the landscape ${inl("|H(z)|")}, but this time the slice runs around the unit circle: ${inl("z = e^{i\\theta}")}. That's the <b>discrete-time Fourier transform</b> (DTFT) from lesson 18. Walking once round the circle covers every frequency a sampled signal can have, from 0 up to ${inl("\\pi")} (the fastest wiggle, flipping sign every sample) and back down the other side.</p>
    <p>Stability works the same way too, with the circle in place of the axis: a filter is stable when every pole is inside the unit circle.</p>`));
  const PRESETS = {
    res: { poles: [[0.92, 0.6]], zeros: [] },
    two: { poles: [[0.9, 0.5], [0.85, 1.9]], zeros: [] },
    notch: { poles: [[0.9, 1.2]], zeros: [[1, 1.2]] },
    low: { poles: [[0.8, 0]], zeros: [[1, Math.PI]] },
    bad: { poles: [[1.05, 0.8]], zeros: [] },
  };
  // Stored as [radius, angle] for the upper half; the mirror image is added for the math.
  let poles = PRESETS.res.poles.map((q) => [...q]), zeros = [];
  const toXY = ([r, a]) => [r * Math.cos(a), r * Math.sin(a)];
  const full = () => ({ P: withConjugates(poles.map(toXY)), Z: withConjugates(zeros.map(toXY)) });

  const f3 = figure({ x: [-1.6, 1.6], y: [-1.6, 1.6], equal: true, aspect: 1, xLabel: "Re", yLabel: "Im", cap: "|H(z)| over the z-plane: bright is big. Drag a pole (×) or zero (○); its mirror image follows." });
  const f4 = figure({ x: [0, Math.PI], y: [0, 1.1], aspect: 1.5, vAxis: false, xTicks: [[0, "0"], [Math.PI / 4, "π/4"], [Math.PI / 2, "π/2"], [(3 * Math.PI) / 4, "3π/4"], [Math.PI, "π"]], xLabel: "θ",
    cap: "|H(e<sup>iθ</sup>)|: the landscape read around the unit circle, unrolled. That's the frequency response (the DTFT of h[n])." });
  const f5 = figure({ x: [-0.6, 40.6], y: [-1.1, 1.1], aspect: 2.4, phoneAspect: 1.6, vAxis: false, xLabel: "n", cap: "h[n], the impulse response." });
  const p3 = f3.plot, p4 = f4.plot, p5 = f5.plot;
  plots.push(p3, p4, p5);
  let peak = 1, hmax = 1;
  p3.draw((p) => {
    const { P, Z } = full();
    heatmap(p, (x, y) => cabs(Hz([x, y], P, Z)), { res: narrow ? 70 : 100, range: 55 });
    p.circle(0, 0, 1, { color: p.c.blue, width: 2.5 });
    for (const q of P) if (q[1] < -1e-9) poleMark(p, q[0], q[1], p.c.fg, 6);
    for (const q of Z) if (q[1] < -1e-9) zeroMark(p, q[0], q[1], p.c.fg, 6);
  });
  const handleFor = (list, i, kind) => ({
    get: () => toXY(list()[i]),
    set: (x, y) => {
      let r = Math.min(1.45, Math.hypot(x, y));
      if (Math.abs(r - 1) < 0.03) r = 1;
      let a = Math.abs(Math.atan2(y, x));
      if (a < 0.04) a = 0;
      if (Math.PI - a < 0.04) a = Math.PI;
      list()[i][0] = r; list()[i][1] = a;
      update();
    },
    visible: () => i < list().length,
    draw: (p, x, y) => (kind === "pole" ? poleMark(p, x, y, p.c.accent, 8) : zeroMark(p, x, y, p.c.accent, 8)),
  });
  function rebuildHandles() {
    p3.handles = [];
    poles.forEach((_, i) => p3.handle(handleFor(() => poles, i, "pole")));
    zeros.forEach((_, i) => p3.handle(handleFor(() => zeros, i, "zero")));
  }
  rebuildHandles();
  p4.draw((p) => {
    const { P, Z } = full();
    const st = stableZ(P);
    p.fn((th) => cabs(Hz(cis(th), P, Z)) / peak, { color: p.c.blue, width: 2.5, dash: st ? null : [6, 5], alpha: st ? 1 : 0.5 });
    if (!st) p.text("unstable: no frequency response", Math.PI / 2, 0.95, { color: p.c.accent, align: "center", size: 12 });
    for (const [, a] of poles) if (a > 0 && a < Math.PI) p.line(a, 0, a, 1.1, { color: p.c.accent, width: 1, dash: [3, 4] });
  });
  p5.draw((p) => {
    const { P, Z } = full();
    const h = impulseZ(P, Z, 41);
    const ns = Array.from(h, (_, n) => n);
    p.stems(ns, Array.from(h, (v) => Math.max(-1.1, Math.min(1.1, v / hmax))), { color: p.c.purple, r: 2.5 });
  });
  const pre = segmented({
    label: "Filter", value: "res",
    options: [["res", "Resonator"], ["two", "Two resonances"], ["notch", "Notch"], ["low", "Low-pass"], ["bad", "Unstable"]],
    onChange: (v) => { poles = PRESETS[v].poles.map((q) => [...q]); zeros = PRESETS[v].zeros.map((q) => [...q]); rebuildHandles(); update(); },
  });
  // Hear it: the same filter, slowed and tuned so its ring lands at a hearable pitch.
  // Angles shrink by D (0.6 rad → 440 Hz at 22 050 samples a second); radii are
  // raised to the power 1/M so the ring lasts about a second instead of a few samples.
  const RATE = 22050, D = 0.6 / ((2 * Math.PI * 440) / RATE), M = 2000;
  const audioPt = ([r, a]) => { const rr = r ** (1 / M), aa = a / D; return [rr * Math.cos(aa), rr * Math.sin(aa)]; };
  const listen = listenButton("Hear h[n] ring", () => {
    const P = withConjugates(poles.map(audioPt)), Z = withConjugates(zeros.map(audioPt));
    const dur = stableZ(full().P) ? 2.5 : 1.2;
    return { samples: impulseZ(P, Z, Math.round(RATE * dur)), rate: RATE };
  });
  const read3 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Poles, zeros and the unit circle",
    el("div", { class: "fig-row" }, f3.el, f4.el), f5.el,
    el("div", { class: "controls", style: "grid-template-columns: 1fr" }, pre.el),
    el("div", { class: "btn-row", style: "margin-top:10px" }, listen.el), read3));

  root.append(tryIt([
    "With “Resonator”, drag the pole toward the unit circle. The peak in the slice sharpens and h[n] rings longer. Press “Hear h[n] ring”.",
    "Swing the pole around the circle. The peak moves with its angle θ: angle is frequency.",
    "Pick “Notch”. The zero sits on the circle, so the response drops to zero at that angle.",
    "Drag a pole outside the circle. h[n] grows forever: unstable.",
  ]));

  /* ---------- Figure 3: z = e^{sT} ---------- */
  root.append(prose(`
    <p>Sampling ties the two planes together. Sample ${inl("e^{st}")} every ${inl("T")} seconds and you get ${inl("e^{snT} = (e^{sT})^n")}: exactly ${inl("z^n")} with ${inl("z = e^{sT}")}. So every point of the s-plane lands on a point of the z-plane:</p>
    <ul>
      <li>The left half (decaying) lands inside the unit circle (decaying).</li>
      <li>The ${inl("i\\omega")} axis (steady waves) wraps around the unit circle (steady waves).</li>
      <li>The right half (growing) lands outside.</li>
    </ul>
    <p>But the axis is infinitely long and the circle isn't. Going up the axis by ${inl("2\\pi/T")} takes you once around the circle and back to the same point. Two frequencies ${inl("2\\pi/T")} apart give the same samples. That's aliasing, from lesson 23, seen as geometry.</p>`));
  let T = 0.5, walking = false;
  const s = [-0.6, 3];
  const lim = () => (2.2 * Math.PI) / T;
  const f6 = figure({ x: [-3, 1], y: [-lim(), lim()], aspect: narrow ? 1 : 0.85, phoneAspect: 1, xLabel: "σ", yLabel: "ω", cap: "The s-plane. The shaded strip, |ω| < π/T, is one full trip round the circle. Drag s." });
  const f7 = figure({ x: [-1.6, 1.6], y: [-1.6, 1.6], equal: true, aspect: 1, xLabel: "Re", yLabel: "Im", cap: "The z-plane: z = e<sup>sT</sup>. The faint copies of s, 2π/T higher or lower, land on the very same z." });
  const p6 = f6.plot, p7 = f7.plot;
  plots.push(p6, p7);
  p6.draw((p) => {
    const L = lim(), band = Math.PI / T;
    p.rect(-3, -band, 1, band, { fill: p.c.blue, alpha: 0.08 });
    p.line(-3, band, 1, band, { color: p.c.blue, width: 1, dash: [4, 4] });
    p.line(-3, -band, 1, -band, { color: p.c.blue, width: 1, dash: [4, 4] });
    p.line(0, -L, 0, L, { color: p.c.blue, width: 3 });
    // Lines through s: constant σ (green) and constant ω (gold).
    p.line(s[0], -L, s[0], L, { color: p.c.green, width: 1.5, dash: [6, 4] });
    p.line(-3, s[1], 1, s[1], { color: p.c.gold, width: 1.5, dash: [6, 4] });
    // The copies 2π/T above and below: different s, same samples.
    for (const [k, lbl] of [[1, "s + 2πi/T"], [-1, "s − 2πi/T"]]) {
      const y = s[1] + (k * 2 * Math.PI) / T;
      if (Math.abs(y) < L) {
        p.ctx.save(); p.ctx.globalAlpha = 0.55;
        p.dot(s[0], y, { r: 6, color: p.c.accent });
        p.ctx.restore();
        p.text(lbl, s[0], y, { color: p.c.accent, dx: 10, size: 12 });
      }
    }
  });
  p6.handle({
    get: () => s, color: (c) => c.accent, label: "s",
    set: (x, y) => { s[0] = Math.max(-2.9, Math.min(0.9, Math.round(x * 20) / 20)); s[1] = Math.max(-lim() * 0.98, Math.min(lim() * 0.98, y)); update(); },
  });
  p7.draw((p) => {
    p.circle(0, 0, 1, { color: p.c.blue, width: 3 });
    const zz = sToZ(s, T), r = cabs(zz);
    p.circle(0, 0, r, { color: p.c.green, width: 1.5, dash: [6, 4] });
    const a = s[1] * T;
    p.line(0, 0, 2 * Math.cos(a), 2 * Math.sin(a), { color: p.c.gold, width: 1.5, dash: [6, 4] });
    p.dot(zz[0], zz[1], { r: 7, color: p.c.accent, stroke: p.c.panel });
    p.text("z", zz[0], zz[1], { color: p.c.accent, dx: 10, dy: -10 });
  });
  const sT = slider({ label: "T, seconds between samples", min: 0.2, max: 1, step: 0.05, value: T,
    onInput: (v) => { T = v; p6.setRange(null, [-lim(), lim()]); s[1] = Math.max(-lim() * 0.98, Math.min(lim() * 0.98, s[1])); update(); } });
  const walkBtn = button("Walk up the iω axis", () => {
    walking = !walking;
    walkBtn.textContent = walking ? "Stop walking" : "Walk up the iω axis";
    if (walking) { s[0] = 0; s[1] = -lim() * 0.95; walkAnim.kick(); }
  });
  const walkAnim = animate(f6.el, (dt) => {
    s[1] += dt * (Math.PI / T) * 0.5;
    if (s[1] > lim() * 0.95) s[1] = -lim() * 0.95;
    update();
  }, () => walking);
  anims.push(walkAnim);
  const read6 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("From the s-plane to the z-plane",
    el("div", { class: "fig-row" }, f6.el, f7.el),
    legend([["--blue", "iω axis → unit circle"], ["--green", "constant σ → circle of radius e^(σT)"], ["--gold", "constant ω → ray at angle ωT"]]),
    controls(sT.el), el("div", { class: "btn-row", style: "margin-top:10px" }, walkBtn), read6));

  const m = mathPanel([
    { tex: "X(z) = \\sum_{n=0}^{\\infty} x[n]\\, z^{-n}",
      note: "The (one-sided) z-transform: how much of each spiral zⁿ the signal holds." },
    { tex: "X(r e^{i\\theta}) = \\sum_{n} \\big(x[n]\\, r^{-n}\\big)\\, e^{-i\\theta n}",
      note: "Split z into its size and angle: it's the DTFT of the damped signal x[n] r<sup>−n</sup>. Same trick as the Laplace transform." },
    { tex: "|z| = 1:\\quad X(e^{i\\theta}) = \\sum_n x[n]\\, e^{-i\\theta n} = \\text{the DTFT}",
      note: "On the unit circle the damping is gone, and what's left is the discrete-time Fourier transform." },
    { id: "z", tex: "" },
    { tex: "H(z) = g\\,\\frac{(1 - q_1 z^{-1})(1 - q_2 z^{-1})\\cdots}{(1 - p_1 z^{-1})(1 - p_2 z^{-1})\\cdots}",
      note: "A filter's transfer function. It's stable when every pole p<sub>k</sub> is inside the unit circle." },
    { tex: "z = e^{sT}:\\quad e^{(s + 2\\pi i/T)T} = e^{sT}\\,e^{2\\pi i} = e^{sT}",
      note: "The bridge from continuous to discrete time, and why frequencies 2π/T apart can't be told apart after sampling." },
    { id: "map", tex: "" },
  ], [
    ["z", "a complex number, a point in the z-plane"],
    ["r,\\ \\theta", "its distance from 0 and its angle: growth per sample and frequency per sample"],
    ["z^n", "the building block: a spiral, or a steady wave when |z| = 1"],
    ["x[n],\\ X(z)", "a sampled signal and its z-transform"],
    ["e^{i\\theta}", "a point on the unit circle"],
    ["H(z),\\ h[n]", "a filter's transfer function and its impulse response"],
    ["p_k,\\ q_k", "poles and zeros"],
    ["g", "an overall gain"],
    ["s", "a point in the s-plane (lesson 25)"],
    ["T", "the time between samples, in seconds"],
  ]);
  root.append(m.el);
  root.append(upNext("how all the transforms fit together: series, Fourier transform, DTFT, DFT, Laplace and z, on one map."));

  function update() {
    const r = cabs(z), th = carg(z);
    read1.textContent = Math.abs(r - 1) < 1e-9
      ? `|z| = 1: on the unit circle. zⁿ goes round forever at the same size, turning ${fmt(th, 2)} rad each sample.`
      : r < 1
        ? `|z| = ${fmt(r, 2)}, inside the unit circle: zⁿ spirals in and dies out.`
        : `|z| = ${fmt(r, 2)}, outside the unit circle: zⁿ spirals out and grows.`;
    m.set("z", `z = ${num(r)}\\,e^{${num(th)} i}:\\quad z^n = ${num(r)}^n\\, e^{${num(th)}\\, i n}`);
    const { P, Z } = full();
    let mx = 0;
    for (let i = 0; i <= 500; i++) mx = Math.max(mx, cabs(Hz(cis((Math.PI * i) / 500), P, Z)));
    peak = mx || 1;
    const h = impulseZ(P, Z, 41);
    hmax = Math.max(...Array.from(h, Math.abs)) || 1;
    read3.textContent = stableZ(P)
      ? "Every pole is inside the unit circle, so h[n] dies out: the filter is stable."
      : "A pole is outside the unit circle, so h[n] grows forever: the filter is unstable.";
    const zz = sToZ(s, T);
    read6.textContent = `s = ${fmt(s[0], 2)} + ${fmt(s[1], 2)}i lands on z with |z| = e^(σT) = ${fmt(cabs(zz), 3)} at angle ωT = ${fmt(s[1] * T, 2)} rad. ${Math.abs(s[0]) < 1e-9 ? "σ = 0, so z is on the unit circle." : s[0] < 0 ? "σ < 0, so z is inside." : "σ > 0, so z is outside."}`;
    m.set("map", `s = ${num(s[0])} ${s[1] < 0 ? "-" : "+"} ${num(Math.abs(s[1]))}i,\\ T = ${num(T)}:\\quad z = e^{sT} = ${num(cabs(zz), 3)}\\, e^{${num(s[1] * T)} i}`);
    for (const p of plots) p.request();
  }
  update();

  return { destroy() { stopAll(); anims.forEach((a) => a.stop()); for (const p of plots) p.destroy(); } };
}
