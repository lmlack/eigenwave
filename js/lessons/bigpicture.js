// Lesson 27: how the transforms fit together. A clickable map: the four
// Fourier transforms (continuous or discrete time × periodic or not), the
// Laplace and z-transforms that generalize them, and the operations that
// lead from one to another. Each box or arrow shows its formula, two small
// live plots and a link to the lesson that covers it.

import { figure } from "../plot.js";
import { el, fmt, lessonCss, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, row } from "../tex.js";
import { byId } from "../lessons.js";
import { cabs, cis } from "../cmath.js";
import { Hz, dirichlet, rational, sinc, sToZ, squareCoef } from "./transforms-math.js";
import { heatmap, poleMark } from "./heatmap.js";

const narrow = window.matchMedia("(max-width: 640px)").matches;
const PI = Math.PI;
const piTicks = [[-2 * PI, "−2π"], [-PI, "−π"], [0, "0"], [PI, "π"], [2 * PI, "2π"]];
const RES = [[-0.3, 2]]; // a resonator for the slice demos

/* Every box and arrow. a and b draw the two small plots for parameter v. */
const ITEMS = {
  laplace: {
    title: "Laplace transform", tex: "X(s) = \\int_0^{\\infty} x(t)\\,e^{-st}\\,dt", lesson: "laplace",
    words: "Continuous time, any signal that doesn't grow too fast. The building blocks e<sup>st</sup> can grow or decay as well as wiggle, so it covers signals the Fourier transform can't. Its home is the s-plane.",
    param: { label: "decay rate a in x(t) = e<sup>−at</sup>", min: -0.5, max: 2, value: 1 },
    ra: { x: [0, 6], y: [-0.2, 3] }, rb: { x: [-3, 1], y: [-4, 4] },
    a: (p, v) => p.fn((t) => Math.exp(-v * t), { color: p.c.blue, width: 2.5 }),
    b: (p, v) => {
      heatmap(p, (x, y) => cabs(rational([x, y], [[-v, 0]], [])), { res: 60 });
      p.rect(-v, -4, 1, 4, { fill: p.c.green, alpha: 0.25 });
      p.line(-v, -4, -v, 4, { color: p.c.green, width: 2, dash: [6, 4] });
      p.line(0, -4, 0, 4, { color: p.c.blue, width: 2.5 });
      poleMark(p, -v, 0, p.c.accent);
    },
    capA: "x(t) = e<sup>−at</sup>", capB: "|X(s)| over the s-plane, the pole at −a and the region of convergence (ROC, shaded green, right of the dashed line). Blue: the iω axis.",
  },
  ztr: {
    title: "z-transform", tex: "X(z) = \\sum_{n=0}^{\\infty} x[n]\\,z^{-n}", lesson: "ztransform",
    words: "Discrete time, the Laplace transform's twin. The building blocks zⁿ spiral in or out as well as turn. Its home is the z-plane, with the unit circle where the s-plane had its axis.",
    param: { label: "ratio a in x[n] = aⁿ", min: 0.3, max: 1.15, value: 0.8 },
    ra: { x: [-0.6, 15.6], y: [-0.2, 2.2] }, rb: { x: [-1.6, 1.6], y: [-1.6, 1.6], equal: true },
    a: (p, v) => { const ns = [...Array(16).keys()]; p.stems(ns, ns.map((n) => Math.min(2.2, v ** n)), { color: p.c.blue, r: 2.5 }); },
    b: (p, v) => {
      heatmap(p, (x, y) => cabs(Hz([x, y], [[v, 0]], [])), { res: 60, range: 50 });
      p.circle(0, 0, 1, { color: p.c.blue, width: 2.5 });
      poleMark(p, v, 0, p.c.accent);
    },
    capA: "x[n] = aⁿ", capB: "|X(z)| over the z-plane and its pole at a. Blue: the unit circle.",
  },
  ctft: {
    title: "Fourier transform", tex: "X(\\omega) = \\int_{-\\infty}^{\\infty} x(t)\\,e^{-i\\omega t}\\,dt", lesson: "transform",
    words: "Continuous time, not periodic. Steady waves of every frequency, so the spectrum is a continuous curve.",
    param: { label: "pulse width τ", min: 0.3, max: 3, value: 1 },
    ra: { x: [-3, 3], y: [-0.2, 1.3] }, rb: { x: [-4, 4], y: [-0.1, 3.2] },
    a: (p, v) => p.path([[-3, 0], [-v / 2, 0], [-v / 2, 1], [v / 2, 1], [v / 2, 0], [3, 0]], { color: p.c.blue, width: 2.5 }),
    b: (p, v) => p.fn((f) => v * Math.abs(sinc(f * v)), { color: p.c.purple, width: 2.5 }),
    capA: "A pulse of width τ", capB: "|X(f)| = τ |sinc(fτ)|: a continuous spectrum",
  },
  dtft: {
    title: "DTFT", tex: "X(e^{i\\omega}) = \\sum_{n=-\\infty}^{\\infty} x[n]\\,e^{-i\\omega n}", lesson: "windows",
    words: "Discrete-time Fourier transform: sampled, not periodic. The spectrum is a continuous curve again, but it repeats every 2π, because frequencies 2π apart give the same samples.",
    param: { label: "number of ones L", min: 1, max: 9, step: 1, value: 5, format: (v) => String(v) },
    ra: { x: [-2.6, 10.6], y: [-0.2, 1.3] }, rb: { x: [-2 * PI, 2 * PI], y: [-0.2, 9.5], xTicks: piTicks },
    a: (p, v) => { const ns = [...Array(13).keys()].map((n) => n - 2); p.stems(ns, ns.map((n) => (n >= 0 && n < v ? 1 : 0)), { color: p.c.blue, r: 2.5 }); },
    b: (p, v) => p.fn((w) => dirichlet(w, v), { color: p.c.purple, width: 2.5 }),
    capA: "L samples equal to 1", capB: "|X(e<sup>iω</sup>)|: continuous, and repeating every 2π",
  },
  fs: {
    title: "Fourier series", tex: "x(t) = \\sum_{k} c_k\\,e^{i k \\omega_0 t}", lesson: "series",
    words: "Continuous time, periodic. Only whole-number multiples of the base frequency fit a repeating signal, so the spectrum is a row of separate spikes.",
    param: { label: "harmonics used, K", min: 1, max: 25, step: 1, value: 7, format: (v) => String(v) },
    ra: { x: [0, 2], y: [-1.5, 1.5] }, rb: { x: [-0.5, 15.5], y: [-0.1, 1.4] },
    a: (p, v) => p.fn((t) => { let s = 0; for (let k = 1; k <= v; k += 2) s += squareCoef(k) * Math.sin(2 * PI * k * t); return s; }, { color: p.c.blue, width: 2 }),
    b: (p, v) => { const ks = [...Array(16).keys()]; p.stems(ks, ks.map((k) => (k <= v ? squareCoef(k) : 0)), { color: p.c.purple, r: 3 }); },
    capA: "A square wave from its first K harmonics", capB: "Coefficient sizes: spikes at whole-number frequencies only",
  },
  dft: {
    title: "DFT", tex: "X[k] = \\sum_{n=0}^{N-1} x[n]\\,e^{-2\\pi i kn/N}", lesson: "dft",
    words: "Discrete Fourier transform: sampled and periodic (or treated as if it were). N numbers in, N numbers out. It's the one computers actually run, through the FFT.",
    param: { label: "frequency k₀ of the wave", min: 0, max: 8, step: 1, value: 3, format: (v) => String(v) },
    ra: { x: [-0.6, 15.6], y: [-1.3, 1.3] }, rb: { x: [-0.6, 15.6], y: [-0.4, 9] },
    a: (p, v) => { const ns = [...Array(16).keys()]; p.stems(ns, ns.map((n) => Math.cos((2 * PI * v * n) / 16)), { color: p.c.blue, r: 2.5 }); },
    b: (p, v) => { const ks = [...Array(16).keys()]; p.stems(ks, ks.map((k) => (v === 0 || v === 8 ? (k === v ? 16 : 0) : k === v || k === 16 - v ? 8 : 0)), { color: p.c.purple, r: 3 }); },
    capA: "cos(2π k₀ n / 16), 16 samples", capB: "|X[k]|: 16 numbers, spikes at k₀ and 16 − k₀",
  },
  s2f: {
    arrow: true, title: "Fourier = Laplace on the iω axis", tex: "X(i\\omega) = X(s)\\big|_{s = i\\omega}", lesson: "laplace",
    words: "Set σ = 0 and the Laplace transform becomes the Fourier transform. Slide σ: each vertical line through the s-plane gives a different slice. Only the one at σ = 0 is the frequency response.",
    param: { label: "where to slice, σ", min: -1.5, max: 0.5, value: 0 },
    ra: { x: [-2, 1], y: [-4, 4] }, rb: { x: [0, 4], y: [0, 1.1] },
    a: (p, v) => {
      const P = [[-0.3, 2], [-0.3, -2]];
      heatmap(p, (x, y) => cabs(rational([x, y], P, [])), { res: 60 });
      p.line(0, -4, 0, 4, { color: p.c.blue, width: 2.5 });
      p.line(v, -4, v, 4, { color: p.c.accent, width: 2, dash: [5, 4] });
      poleMark(p, -0.3, 2, p.c.fg); poleMark(p, -0.3, -2, p.c.fg);
    },
    b: (p, v) => {
      const P = [[-0.3, 2], [-0.3, -2]];
      let mx = 0;
      for (let i = 0; i <= 200; i++) mx = Math.max(mx, cabs(rational([0, (4 * i) / 200], P, [])));
      p.fn((w) => cabs(rational([v, w], P, [])) / mx, { color: Math.abs(v) < 1e-9 ? p.c.blue : p.c.accent, width: 2.5 });
    },
    capA: "|H(s)| for a resonator; the dashed line is your slice", capB: "|H| along the slice. At σ = 0 it's the frequency response",
  },
  z2f: {
    arrow: true, title: "DTFT = z-transform on the unit circle", tex: "X(e^{i\\omega}) = X(z)\\big|_{z = e^{i\\omega}}", lesson: "ztransform",
    words: "Set |z| = 1 and the z-transform becomes the DTFT. Each circle of radius r gives a slice; only the unit circle is the frequency response.",
    param: { label: "radius of the slice, r", min: 0.6, max: 1.3, value: 1 },
    ra: { x: [-1.6, 1.6], y: [-1.6, 1.6], equal: true }, rb: { x: [0, PI], y: [0, 1.1], xTicks: [[0, "0"], [PI / 2, "π/2"], [PI, "π"]] },
    a: (p, v) => {
      const P = [[0.9 * Math.cos(1), 0.9 * Math.sin(1)], [0.9 * Math.cos(1), -0.9 * Math.sin(1)]];
      heatmap(p, (x, y) => cabs(Hz([x, y], P, [])), { res: 60, range: 50 });
      p.circle(0, 0, 1, { color: p.c.blue, width: 2.5 });
      p.circle(0, 0, v, { color: p.c.accent, width: 2, dash: [5, 4] });
    },
    b: (p, v) => {
      const P = [[0.9 * Math.cos(1), 0.9 * Math.sin(1)], [0.9 * Math.cos(1), -0.9 * Math.sin(1)]];
      let mx = 0;
      for (let i = 0; i <= 200; i++) mx = Math.max(mx, cabs(Hz(cis((PI * i) / 200), P, [])));
      p.fn((w) => cabs(Hz([v * Math.cos(w), v * Math.sin(w)], P, [])) / mx, { color: Math.abs(v - 1) < 0.01 ? p.c.blue : p.c.accent, width: 2.5 });
    },
    capA: "|H(z)| for a resonator; the dashed circle is your slice", capB: "|H| around the slice. On the unit circle it's the frequency response",
  },
  sample: {
    arrow: true, title: "Sampling: continuous → discrete", tex: "x[n] = x(nT) \\quad\\Rightarrow\\quad X_d(e^{i\\omega}) = \\tfrac{1}{T}\\sum_k X\\!\\left(\\tfrac{\\omega - 2\\pi k}{T}\\right)", lesson: "sampling",
    words: "Sample every T seconds and the spectrum gets copied every 2π/T. That's why the DTFT repeats, and why a frequency above half the sample rate lands on top of a lower one: aliasing.",
    param: { label: "samples per second", min: 2, max: 12, value: 8 },
    ra: { x: [0, 2], y: [-1.3, 1.3] }, rb: { x: [-20, 20], y: [-0.1, 1.2] },
    a: (p, v) => {
      p.fn((t) => Math.cos(2 * PI * 3 * t), { color: p.c.blue, width: 1.5, alpha: 0.6 });
      const ts = []; for (let t = 0; t <= 2 + 1e-9; t += 1 / v) ts.push(t);
      p.stems(ts, ts.map((t) => Math.cos(2 * PI * 3 * t)), { color: p.c.accent, r: 3 });
    },
    b: (p, v) => {
      const fs = [];
      for (let k = -6; k <= 6; k++) for (const f of [3, -3]) { const g = f + k * v; if (Math.abs(g) <= 20) fs.push(g); }
      p.rect(-v / 2, -0.1, v / 2, 1.2, { fill: p.c.green, alpha: 0.12 });
      p.stems(fs, fs.map((f) => (Math.abs(f) === 3 ? 1 : 0.6)), { color: p.c.purple, r: 3 });
    },
    capA: "A 3 Hz wave and its samples", capB: "Spectrum of the samples: the ±3 Hz spikes, copied every fs. Shaded: |f| < fs/2",
  },
  periodic: {
    arrow: true, title: "Period → ∞: series becomes transform", tex: "T c_k \\;\\to\\; X(\\omega)\\ \\text{ as } T \\to \\infty,\\quad \\omega = k\\,\\tfrac{2\\pi}{T}", lesson: "transform",
    words: "Stretch the period of a repeating signal and its spikes crowd closer together. In the limit there's one pulse left, and the spikes have merged into the continuous Fourier transform. Going the other way, repeating a signal turns its spectrum into spikes.",
    param: { label: "period T", min: 1.5, max: 12, value: 3 },
    ra: { x: [-6, 6], y: [-0.2, 1.3] }, rb: { x: [-4, 4], y: [-0.3, 1.2] },
    a: (p, v) => { for (let k = -6; k <= 6; k++) { const c = k * v; if (Math.abs(c) < 7) p.path([[c - 0.5, 0], [c - 0.5, 1], [c + 0.5, 1], [c + 0.5, 0]], { color: p.c.blue, width: 2 }); } p.line(-6, 0, 6, 0, { color: p.c.blue, width: 2 }); },
    b: (p, v) => {
      p.fn((f) => sinc(f), { color: p.c.fgSubtle, width: 1.2, dash: [4, 4] });
      const ks = []; for (let k = -40; k <= 40; k++) if (Math.abs(k / v) <= 4) ks.push(k);
      p.stems(ks.map((k) => k / v), ks.map((k) => sinc(k / v)), { color: p.c.purple, r: 2.5 });
    },
    capA: "Pulses of width 1, repeating every T", capB: "T·c<sub>k</sub> at frequency k/T, under the pulse's sinc curve",
  },
  dftdtft: {
    arrow: true, title: "The DFT samples the DTFT", tex: "X[k] = X(e^{i\\omega})\\big|_{\\omega = 2\\pi k/N}", lesson: "windows",
    words: "For a signal that's zero outside N samples, the DFT is the DTFT read at N evenly spaced frequencies. Pad with zeros to get more of them: a smoother picture, but no new detail.",
    param: { label: "DFT length N", min: 5, max: 40, step: 1, value: 8, format: (v) => String(v) },
    ra: { x: [-0.6, 40.6], y: [-0.2, 1.3] }, rb: { x: [0, 2 * PI], y: [-0.2, 5.5], xTicks: [[0, "0"], [PI, "π"], [2 * PI, "2π"]] },
    a: (p, v) => { const ns = [...Array(v).keys()]; p.stems(ns, ns.map((n) => (n < 5 ? 1 : 0)), { color: p.c.blue, r: 2.5 }); },
    b: (p, v) => {
      p.fn((w) => dirichlet(w, 5), { color: p.c.purple, width: 2, alpha: 0.6 });
      const ks = [...Array(v).keys()];
      for (const k of ks) p.dot((2 * PI * k) / v, dirichlet((2 * PI * k) / v, 5), { r: 3.5, color: p.c.accent });
    },
    capA: "5 ones, padded with zeros to N", capB: "The DTFT (curve) and the N DFT values on it (dots)",
  },
  s2z: {
    arrow: true, title: "z = e^{sT}: the s-plane onto the z-plane", tex: "z = e^{sT}", lesson: "ztransform",
    words: "Sampling every T seconds maps each s to z = e<sup>sT</sup>. The left half goes inside the unit circle, the iω axis wraps round the circle once every 2π/T, and the right half goes outside.",
    param: { label: "T, seconds between samples", min: 0.2, max: 1, value: 0.5 },
    ra: { x: [-2, 1], y: [-12, 12] }, rb: { x: [-1.6, 1.6], y: [-1.6, 1.6], equal: true },
    a: (p, v) => {
      const L = PI / v;
      p.rect(-2, -L, 1, L, { fill: p.c.blue, alpha: 0.08 });
      p.line(0, -12, 0, 12, { color: p.c.blue, width: 2.5 });
      for (const [sg, col] of [[-1, p.c.green], [-0.4, p.c.gold], [0.3, p.c.accent]]) p.line(sg, -12, sg, 12, { color: col, width: 2, dash: [5, 4] });
    },
    b: (p, v) => {
      p.circle(0, 0, 1, { color: p.c.blue, width: 2.5 });
      for (const [sg, col] of [[-1, p.c.green], [-0.4, p.c.gold], [0.3, p.c.accent]]) p.circle(0, 0, cabs(sToZ([sg, 0], v)), { color: col, width: 2, dash: [5, 4] });
    },
    capA: "Lines of constant σ in the s-plane. Shaded: |ω| < π/T", capB: "Each lands on a circle of radius e<sup>σT</sup>; σ = 0 on the unit circle",
  },
};

/* Layout: rows of [left, middle, right]; null is an empty cell. */
const LAYOUT = [
  ["laplace", "s2z", "ztr"],
  ["s2f", null, "z2f"],
  ["ctft", "sample", "dtft"],
  ["periodic", null, "dftdtft"],
  ["fs", "sample", "dft"],
];
const BOX_SUB = {
  laplace: "e<sup>st</sup>, the s-plane", ztr: "zⁿ, the z-plane",
  ctft: "not periodic", dtft: "not periodic",
  fs: "periodic", dft: "periodic, N samples",
};
const ARROW_TEXT = {
  s2z: ["→", "z = e<sup>sT</sup>"], s2f: ["↓", "s = iω"], z2f: ["↓", "z = e<sup>iω</sup>"],
  sample: ["→", "sample"], periodic: ["↕", "period → ∞"], dftdtft: ["↕", "sample the spectrum"],
};

export function mount(root) {
  lessonCss("bigpicture");
  const plots = [];

  root.append(prose(`
    <p>By now there are six transforms on the table, and it's easy to lose track of which is which. They're really one idea used in six settings. Each one writes a signal as a mix of exponentials, and asks how much of each it holds. What changes is which exponentials are allowed:</p>
    <ul>
      <li>Is time <b>continuous</b> or <b>sampled</b>? Continuous time uses ${inl("e^{st}")}; sampled time uses ${inl("z^n")}.</li>
      <li>Can the exponentials <b>grow and decay</b>, or only <b>wiggle</b>? Laplace and z allow the whole plane. Fourier keeps only the steady ones: the ${inl("i\\omega")} axis, or the unit circle.</li>
      <li>Is the signal <b>periodic</b>? Then only frequencies that fit a whole number of times into the period survive, and the spectrum becomes separate spikes.</li>
    </ul>
    <p>Click any box or arrow on the map to see its formula, a small live example, and the lesson that covers it.</p>`));

  /* ---------- The map ---------- */
  const buttons = {};
  const map = el("div", { class: "bp-map", role: "group", "aria-label": "Map of transforms" });
  for (const r of LAYOUT) for (const id of r) {
    if (!id) { map.append(el("div", { class: "bp-empty" })); continue; }
    const it = ITEMS[id];
    let b;
    if (it.arrow) {
      const [g, t] = ARROW_TEXT[id];
      b = el("button", { type: "button", class: "bp-arrow", "aria-pressed": "false", html: `<span class="g" aria-hidden="true">${g}</span><span>${t}</span>` });
    } else {
      b = el("button", { type: "button", class: `bp-box${id === "laplace" || id === "ztr" ? " gen" : ""}`, "aria-pressed": "false", html: `<b>${it.title}</b><span>${BOX_SUB[id]}</span>` });
    }
    b.addEventListener("click", () => select(id));
    (buttons[id] ??= []).push(b);
    map.append(b);
  }
  const heads = el("div", { class: "bp-heads", html: "<p>Continuous time</p><p></p><p>Discrete time</p>" });

  /* ---------- The detail view ---------- */
  const title = el("h3");
  const formula = el("div", { class: "eq", style: "overflow-x:auto;overflow-y:hidden;white-space:nowrap" });
  const words = el("p", { class: "small", style: "margin:4px 0 10px" });
  const fa = figure({ x: [0, 1], y: [0, 1], aspect: 1.6, phoneAspect: 1.4 });
  const fb = figure({ x: [0, 1], y: [0, 1], aspect: 1.6, phoneAspect: 1.4 });
  const pa = fa.plot, pb = fb.plot;
  plots.push(pa, pb);
  const capA = el("p", { class: "cap" }), capB = el("p", { class: "cap" });
  fa.el.append(capA); fb.el.append(capB);
  const ctlHost = el("div", { class: "controls" });
  const go = el("a", { class: "btn go" });
  const detail = el("div", { class: "bp-detail" }, title, formula, words, el("div", { class: "fig-row" }, fa.el, fb.el), ctlHost, go);

  root.append(panel("The map", heads, map), panel(null, detail));

  let cur = null, v = 0;
  function select(id) {
    cur = ITEMS[id];
    for (const [k, bs] of Object.entries(buttons)) for (const b of bs) b.setAttribute("aria-pressed", String(k === id));
    title.textContent = cur.title.replace("e^{sT}", "eˢᵀ");
    formula.innerHTML = row(cur.tex);
    words.innerHTML = cur.words;
    capA.innerHTML = cur.capA; capB.innerHTML = cur.capB;
    v = cur.param.value;
    const s = slider({ label: cur.param.label, min: cur.param.min, max: cur.param.max, step: cur.param.step ?? 0.01, value: v,
      format: cur.param.format ?? ((x) => fmt(x, 2)), onInput: (x) => { v = x; pa.request(); pb.request(); } });
    ctlHost.replaceChildren(s.el);
    setPlot(pa, cur.ra);
    setPlot(pb, cur.rb);
    pa.draw((p) => cur.a(p, v));
    pb.draw((p) => cur.b(p, v));
    const l = byId[cur.lesson];
    go.href = `#${l.id}`;
    go.textContent = `Go to lesson ${l.n}: ${l.title} →`;
  }
  function setPlot(p, r) {
    p.o.equal = !!r.equal;
    p.o.xTicks = r.xTicks;
    p.o.yTicks = r.yTicks;
    p.o.vAxis = r.vAxis;
    p.setRange(r.x, r.y);
  }

  root.append(tryIt([
    "Click “Laplace transform”, then the arrow “s = iω” below it. Slide σ to 0: the slice through the s-plane becomes the Fourier transform's frequency response.",
    "Do the same on the right: “z = e<sup>iω</sup>” and slide r to 1.",
    "Click “sample” and lower the sample rate below 6 per second. The copies of the spectrum slide into the shaded band: aliasing.",
    "Click “period → ∞” and drag the period up. The spikes of the series crowd together until they trace the transform's curve.",
  ]));

  const m = mathPanel([
    { html: "<b>One idea, six ways:</b> how much of each exponential is in the signal." },
    { tex: "X(s) = \\int x(t)\\,e^{-st}\\,dt \\;\\xrightarrow{\\;s\\,=\\,i\\omega\\;}\\; X(\\omega) = \\int x(t)\\,e^{-i\\omega t}\\,dt",
      note: "Laplace to Fourier: keep only the steady waves." },
    { tex: "X(z) = \\sum x[n]\\,z^{-n} \\;\\xrightarrow{\\;z\\,=\\,e^{i\\omega}\\;}\\; X(e^{i\\omega}) = \\sum x[n]\\,e^{-i\\omega n}",
      note: "z to DTFT: the same step for sampled signals." },
    { tex: "x[n] = x(nT),\\qquad z = e^{sT}",
      note: "Sampling links the two columns, and folds the s-plane onto the z-plane." },
    { tex: "x(t + T_0) = x(t) \\;\\Rightarrow\\; \\omega \\in \\Big\\{k\\,\\tfrac{2\\pi}{T_0}\\Big\\},\\qquad x[n + N] = x[n] \\;\\Rightarrow\\; \\omega \\in \\Big\\{\\tfrac{2\\pi k}{N}\\Big\\}",
      note: "Periodic in time means separate spikes in frequency: the Fourier series and the DFT." },
    { tex: "\\text{sampled in time} \\;\\Leftrightarrow\\; \\text{periodic in frequency},\\qquad \\text{periodic in time} \\;\\Leftrightarrow\\; \\text{sampled in frequency}",
      note: "The rule behind the whole grid. The DFT is both, which is why it's finite and a computer can do it." },
  ], [
    ["s = \\sigma + i\\omega", "a point in the s-plane: growth σ and frequency ω"],
    ["z = r\\,e^{i\\theta}", "a point in the z-plane: growth per sample r and frequency per sample θ"],
    ["\\omega", "frequency in radians per second (continuous) or per sample (discrete)"],
    ["T", "the time between samples"],
    ["T_0,\\ N", "the period of a periodic signal, in seconds or in samples"],
    ["c_k", "a Fourier series coefficient"],
    ["X(\\cdot)", "a transform; the brackets say which kind"],
  ]);
  root.append(m.el);
  root.append(upNext("that's the end of the course. Pick any box above to jump back to its lesson, or go back to the <a href=\"#home\">course map</a>."));

  select("laplace");
  return { destroy() { for (const p of plots) p.destroy(); } };
}
