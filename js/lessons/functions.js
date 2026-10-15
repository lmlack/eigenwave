// Lesson 9: functions are vectors. Sample two functions and their dot
// product becomes an integral; sines of different speeds are perpendicular.
// Then draw any function and project it onto the first K sines and cosines.

import { figure } from "../plot.js";
import { button, controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { TAU } from "../cmath.js";
import { SHAPES, fourierProject, rms, rmsError, sampleShape, sampledInner } from "./functions-math.js";

const PI_TICKS = [[0, "0"], [Math.PI / 2, "π/2"], [Math.PI, "π"], [1.5 * Math.PI, "3π/2"], [TAU, "2π"]];

export function mount(root) {
  root.append(prose(`
    <p>Sample a function at ${inl("N")} points and you get a list of ${inl("N")} numbers: a vector. Sample it at more points and the vector gets longer. In the limit a function is a vector with one entry for every ${inl("x")}.</p>
    <p>The dot product carries over. For vectors it's "multiply matching entries and add". For functions it's "multiply the two functions and add up the area": ${inl("\\langle f, g\\rangle = \\int f(x)\\,g(x)\\,dx")}. The sum of samples, each weighted by the spacing ${inl("\\Delta x")}, turns into that integral as the spacing shrinks.</p>
    <p>And two functions are <b>perpendicular</b> (orthogonal) when that area comes out to zero: the positive parts of the product cancel the negative parts exactly.</p>`));

  /* ---------- Figure 1: inner product of two functions ---------- */
  let m = 2, n = 3, N = 12, fKind = "sin", gKind = "sin";
  const F = {
    sin: (x) => Math.sin(m * x),
    bump: (x) => Math.exp(-((x - 2) ** 2) * 1.5),
  };
  const G = {
    sin: (x) => Math.sin(n * x),
    cos: (x) => Math.cos(n * x),
  };
  const f = (x) => F[fKind](x), g = (x) => G[gKind](x);
  const prod = (x) => f(x) * g(x);
  const exact = () => sampledInner(f, g, 20000);

  const f1 = figure({ x: [0, TAU], y: [-1.3, 1.3], aspect: 2.2, xTicks: PI_TICKS, vAxis: false,
    cap: "The product f g, with its area above zero in green and below zero in orange. The bars are the sampled sum: each one is f(x_n) g(x_n) Δx." });
  const p = f1.plot;
  p.draw((p) => {
    const dx = TAU / N;
    // The sampled sum as bars.
    for (let k = 0; k < N; k++) {
      const x = (k + 0.5) * dx, v = prod(x);
      p.rect(k * dx, 0, (k + 1) * dx, v, { fill: v >= 0 ? p.c.green : p.c.accent, alpha: 0.22 });
    }
    // The area under f g, split by sign.
    const S = 400, pos = [[0, 0]], neg = [[0, 0]];
    for (let i = 0; i <= S; i++) {
      const x = (TAU * i) / S, v = prod(x);
      pos.push([x, Math.max(0, v)]);
      neg.push([x, Math.min(0, v)]);
    }
    pos.push([TAU, 0]); neg.push([TAU, 0]);
    p.path(pos, { fill: p.c.green, width: 0, alpha: 0.25, close: true });
    p.path(neg, { fill: p.c.accent, width: 0, alpha: 0.25, close: true });
    p.fn(f, { color: p.c.blue, width: 1.5, alpha: 0.6 });
    p.fn(g, { color: p.c.purple, width: 1.5, alpha: 0.6 });
    p.fn(prod, { color: p.c.fg, width: 2.5 });
    const xs = Array.from({ length: N }, (_, k) => (k + 0.5) * dx);
    p.stems(xs, xs.map(prod), { color: p.c.fg, r: 3, width: 1 });
  });

  const fSeg = segmented({ label: "f", value: fKind, options: [["sin", "f = sin(m x)"], ["bump", "f = a bump"]], onChange: (v) => { fKind = v; update(); } });
  const gSeg = segmented({ label: "g", value: gKind, options: [["sin", "g = sin(n x)"], ["cos", "g = cos(n x)"]], onChange: (v) => { gKind = v; update(); } });
  const sm = slider({ label: "m", min: 1, max: 6, step: 1, value: m, format: String, onInput: (v) => { m = v; update(); } });
  const sn = slider({ label: "n", min: 1, max: 6, step: 1, value: n, format: String, onInput: (v) => { n = v; update(); } });
  const sN = slider({ label: "N, how many samples", min: 2, max: 80, step: 1, value: N, format: String, onInput: (v) => { N = v; update(); } });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Multiply, then add up the area",
    f1.el,
    legend([["--blue", "f"], ["--purple", "g"], ["--fg", "f g"], ["--green", "area above zero"], ["--accent", "area below zero"]]),
    el("div", { class: "btn-row", style: "margin-top:12px" }, fSeg.el, gSeg.el),
    controls(sm.el, sn.el, sN.el), status));

  root.append(tryIt([
    "With f = sin(2x) and g = sin(3x), the green and orange areas match: the integral is 0. Two sines of different speeds are perpendicular.",
    "Set m = n. Now the product is a sine squared, never below zero, and the integral is π: the squared length of sin(n x).",
    "Switch g to cos(n x) and set m = n. Still zero: a sine and a cosine are perpendicular even at the same speed.",
    "Switch f to the bump and slide N from 2 up. The bars' total creeps toward the true area. For two waves it's exact much sooner, once N is bigger than m + n: that's the root-of-unity sum from lesson 8 again.",
  ]));

  /* ---------- Figure 2: draw a function, project it ---------- */
  root.append(prose(`
    <p>Here's why perpendicular matters. If your building blocks are perpendicular, finding how much of each one is in a function is just an inner product, one block at a time. No equations to solve. The amount of ${inl("\\sin kx")} in ${inl("f")} is ${inl("\\langle f, \\sin kx\\rangle")} divided by ${inl("\\langle \\sin kx, \\sin kx\\rangle = \\pi")}.</p>
    <p>Draw any function below. The page takes its inner product with ${inl("1")}, ${inl("\\cos kx")} and ${inl("\\sin kx")} for ${inl("k = 1")} to ${inl("K")}, then adds those pieces back up. That's a <b>Fourier series</b>, and it's just a projection onto perpendicular vectors.</p>`));

  const M = 256;
  let samples = sampleShape(SHAPES.square, M);
  let K = 5, proj = fourierProject(samples, K);
  const f2 = figure({ x: [0, TAU], y: [-1.8, 1.8], aspect: 2.2, xTicks: PI_TICKS, vAxis: false,
    cap: "Draw on the plot with a finger or the mouse. Blue is your function, orange is its projection onto the first K sines and cosines." });
  const q = f2.plot;
  q.draw((q) => {
    q.path(samples.map((v, i) => [((i + 0.5) * TAU) / M, v]), { color: q.c.blue, width: 2.5 });
    q.fn(proj.at, { color: q.c.accent, width: 2.5 });
  });
  let last = null;
  q.onDrag = (x, y, first) => {
    const idx = (xx) => Math.max(0, Math.min(M - 1, Math.round((xx / TAU) * M - 0.5)));
    const yy = Math.max(-1.7, Math.min(1.7, y));
    const i1 = idx(x);
    if (first || !last) last = [i1, yy];
    // Fill every sample between the last point and this one.
    const [i0, y0] = last;
    const lo = Math.min(i0, i1), hi = Math.max(i0, i1);
    for (let i = lo; i <= hi; i++) samples[i] = hi === lo ? yy : y0 + ((yy - y0) * (i - i0)) / (i1 - i0);
    last = [i1, yy];
    reproject();
  };
  q.onDragEnd = () => { last = null; };

  const f3 = figure({ x: [-0.6, 20.6], y: [-1.5, 1.5], aspect: 3, xTicks: 1, vAxis: false,
    cap: "The coefficients: how much of cos kx (blue) and sin kx (green) the function holds. Bar 0 is the average." });
  const g3 = f3.plot;
  g3.draw((g) => {
    const ks = Array.from({ length: K }, (_, i) => i + 1);
    g.stems([0], [proj.a0], { color: g.c.fg });
    g.stems(ks.map((k) => k - 0.18), proj.a, { color: g.c.blue });
    g.stems(ks.map((k) => k + 0.18), proj.b, { color: g.c.green });
  });

  const sK = slider({ label: "K, how many sines and cosines", min: 0, max: 20, step: 1, value: K, format: String, onInput: (v) => { K = v; reproject(); } });
  const presets = el("div", { class: "btn-row" },
    ...Object.keys(SHAPES).map((k) => button(k[0].toUpperCase() + k.slice(1), () => { samples = sampleShape(SHAPES[k], M); reproject(); })),
    button("Clear", () => { samples = new Array(M).fill(0); reproject(); }));
  const status2 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Draw a function, then project it",
    f2.el, f3.el,
    legend([["--blue", "your function"], ["--accent", "sum of the first K pieces"]]),
    controls(sK.el, presets), status2));

  root.append(tryIt([
    "Slide K up on the square wave. The orange curve hugs it more closely, but it keeps a little overshoot at each jump. That overshoot never goes away; it's called the Gibbs phenomenon, and lesson 16 looks at it.",
    "The square wave uses only sines, and only odd ones: the cosine bars and even sine bars stay at zero. It's odd about π, and sines are too.",
    "Draw something smooth and slow. A handful of pieces is enough. Draw something jagged and you need many.",
  ]));

  /* ---------- The math ---------- */
  const mp = mathPanel([
    { tex: "\\langle f, g\\rangle = \\int_0^{2\\pi} f(x)\\, g(x)\\, dx \\;\\approx\\; \\sum_{n=0}^{N-1} f(x_n)\\, g(x_n)\\, \\Delta x, \\qquad \\Delta x = \\frac{2\\pi}{N}",
      note: "The dot product of the sampled vectors, weighted by the spacing. As N grows, the sum becomes the integral." },
    { id: "ip", tex: "" },
    { tex: "\\int_0^{2\\pi} \\sin(mx)\\sin(nx)\\,dx = \\begin{cases} \\pi & m = n \\\\ 0 & m \\ne n \\end{cases}, \\qquad \\int_0^{2\\pi} \\sin(mx)\\cos(nx)\\,dx = 0",
      note: "Sines and cosines of whole-number speeds are all perpendicular to each other on [0, 2π]." },
    { tex: "f(x) \\approx a_0 + \\sum_{k=1}^{K} \\big(a_k \\cos kx + b_k \\sin kx\\big)" },
    { tex: "a_0 = \\frac{\\langle f, 1\\rangle}{2\\pi}, \\qquad a_k = \\frac{\\langle f, \\cos kx\\rangle}{\\pi}, \\qquad b_k = \\frac{\\langle f, \\sin kx\\rangle}{\\pi}",
      note: "Each coefficient is an inner product divided by that basis function's squared length: the projection formula from lesson 5, with integrals." },
    { id: "coef", tex: "" },
  ], [
    ["f,\\ g", "functions on [0, 2π], thought of as vectors"],
    ["\\langle f, g\\rangle", "their inner product: the area under f times g"],
    ["x_n", "the nth sample point, the middle of the nth piece"],
    ["N", "how many sample points"],
    ["\\Delta x", "the spacing between sample points, 2π / N"],
    ["m,\\ n,\\ k", "whole-number speeds: how many full waves fit in [0, 2π]"],
    ["K", "how many sines and cosines the projection uses"],
    ["a_0", "the average value of f"],
    ["a_k,\\ b_k", "how much of cos kx and sin kx are in f"],
    ["\\int", "the area under a curve, counted negative below zero"],
  ]);
  root.append(mp.el);
  root.append(upNext("signals. A list of numbers indexed by time is a vector, and shifting, flipping and stretching it are things you do to that vector."));

  function update() {
    sm.el.hidden = fKind !== "sin";
    const sum = sampledInner(f, g, N), ex = exact();
    const fl = fKind === "sin" ? `\\sin ${m}x` : "\\text{bump}";
    const gl = gKind === "sin" ? `\\sin ${n}x` : `\\cos ${n}x`;
    mp.set("ip", `N = ${N}: \\ \\sum f g\\,\\Delta x = ${num(sum, 3)}, \\qquad \\int_0^{2\\pi} ${fl}\\, ${gl}\\, dx = ${num(ex, 3)}`);
    status.textContent = Math.abs(ex) < 1e-6
      ? "The areas cancel: f and g are perpendicular."
      : `The areas don't cancel. The inner product is ${fmt(ex, 3)}.`;
    p.request();
  }
  function reproject() {
    proj = fourierProject(samples, K);
    const terms = [`a_0 = ${num(proj.a0)}`];
    for (let k = 1; k <= Math.min(K, 3); k++) terms.push(`a_${k} = ${num(proj.a[k - 1])}`, `b_${k} = ${num(proj.b[k - 1])}`);
    mp.set("coef", `${terms.join(",\\ ")}${K > 3 ? ",\\ \\dots" : ""}`);
    const size = rms(samples), err = rmsError(samples, proj.at);
    status2.textContent = size < 1e-9
      ? "Nothing drawn yet."
      : `With K = ${K}, the projection is off by ${fmt((100 * err) / size, 1)}% of your function's size (root-mean-square).`;
    g3.setRange([-0.6, Math.max(K, 5) + 0.6], null);
    q.request(); g3.request();
  }
  update();
  reproject();

  return { destroy() { p.destroy(); q.destroy(); g3.destroy(); } };
}
