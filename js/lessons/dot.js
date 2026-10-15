// Lesson 2: dot products and projections. Drag a and b, watch the angle, the
// dot product and b's shadow on a. Then the dot product of two signals as a
// measure of how alike they are.

import { figure } from "../plot.js";
import { controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num, vec } from "../tex.js";
import { angle2, dot2, dotN, len2, normN, project } from "./linalg-math.js";

const SHAPES = {
  bump: [0, 0.5, 1.5, 2, 1.5, 0.5, 0, 0],
  wave: [1.5, 1, 0, -1, -1.5, -1, 0, 1],
  step: [-1, -1, -1, -1, 1, 1, 1, 1],
  zigzag: [1, -1, 1, -1, 1, -1, 1, -1],
};

export function mount(root) {
  const a = [2.5, 0.5], b = [1, 2];

  root.append(prose(`
    <p>The <b>dot product</b> of two vectors multiplies them entry by entry and adds up the results: ${inl("a \\cdot b = a_1 b_1 + a_2 b_2")}. You get one number back, not a vector.</p>
    <p>That one number says how much the two vectors point the same way. It's big and positive when they line up, zero when they're at right angles, and negative when they point apart. Geometrically it's ${inl("|a|\\,|b|\\cos\\theta")}, where ${inl("\\theta")} is the angle between them.</p>`));

  /* ---------- Figure 1: a, b and b's shadow on a ---------- */
  const f1 = figure({ x: [-4, 4], y: [-3, 3], equal: true, aspect: 1.4, cap: "Drag the tips of a and b. The orange segment is b's shadow on a." });
  const p = f1.plot;
  p.draw((p) => {
    const L = len2(a);
    if (L > 1e-9) {
      // The line through a, where the shadow lands.
      const u = [a[0] / L, a[1] / L];
      p.line(-8 * u[0], -8 * u[1], 8 * u[0], 8 * u[1], { color: p.c.lineStrong, width: 1, dash: [3, 5] });
    }
    const pr = project(b, a);
    // Angle arc at the origin.
    const th = angle2(a, b);
    if (Number.isFinite(th)) {
      const t0 = Math.atan2(a[1], a[0]);
      const cross = a[0] * b[1] - a[1] * b[0];
      const dir = cross >= 0 ? 1 : -1;
      const pts = [];
      for (let i = 0; i <= 30; i++) { const t = t0 + (dir * th * i) / 30; pts.push([0.55 * Math.cos(t), 0.55 * Math.sin(t)]); }
      p.path(pts, { color: p.c.fgSubtle, width: 1.5 });
      const mid = t0 + (dir * th) / 2;
      p.text("θ", 0.85 * Math.cos(mid), 0.85 * Math.sin(mid), { color: p.c.fgSubtle, align: "center" });
    }
    p.line(b[0], b[1], pr[0], pr[1], { color: p.c.fgSubtle, width: 1.5, dash: [4, 4] });
    p.line(0, 0, pr[0], pr[1], { color: p.c.accent, width: 6, alpha: 0.85 });
    p.arrow(0, 0, a[0], a[1], { color: p.c.blue });
    p.arrow(0, 0, b[0], b[1], { color: p.c.green });
    p.text("a", a[0], a[1], { color: p.c.blue, dx: 10, dy: -10 });
    p.text("b", b[0], b[1], { color: p.c.green, dx: 10, dy: -10 });
  });
  const snap = (x) => Math.round(x * 4) / 4;
  p.handle({ get: () => a, set: (x, y) => { a[0] = snap(x); a[1] = snap(y); update(); }, color: (c) => c.blue, r: 7 });
  p.handle({ get: () => b, set: (x, y) => { b[0] = snap(x); b[1] = snap(y); update(); }, color: (c) => c.green, r: 7 });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });

  root.append(panel("How much do they line up?", f1.el,
    legend([["--blue", "a"], ["--green", "b"], ["--accent", "b's shadow on a (its projection)"]]), status));

  root.append(tryIt([
    "Drag b around a full circle. The dot product is biggest when b points along a, zero at right angles, and most negative when it points the other way.",
    "Put b at right angles to a. The shadow shrinks to a point and the dot product is exactly 0. That's what <strong>orthogonal</strong> means.",
    "Make a twice as long. The dot product doubles, but the shadow stays put: the shadow only cares about a's direction.",
  ]));

  /* ---------- Figure 2: how alike are two signals? ---------- */
  root.append(prose(`
    <p>The same recipe works for eight numbers, or eight thousand. Line up two signals, multiply them sample by sample, and add. Where both are positive, or both negative, the product is positive and the total grows. Where they disagree, it shrinks.</p>
    <p>So the dot product of two signals measures how alike they are. Hold one of them fixed as a <b>template</b> and the dot product tells you how much of that template is in the other signal. That's exactly how the Fourier transform will measure how much of each wave is in a signal.</p>`));

  let tShape = "wave", xShape = "wave", shift = 0;
  const base = SHAPES.wave.slice();
  const x = SHAPES.wave.slice();
  const t = SHAPES.wave.slice();
  const ns = [...Array(8).keys()];

  const f2 = figure({ x: [-0.6, 7.6], y: [-2.5, 2.5], aspect: 2.4, xTicks: 1, vAxis: false, cap: "Blue: the template. Green: the signal. Drag on the plot to change the signal." });
  const q = f2.plot;
  q.draw((q) => {
    q.stems(ns.map((n) => n - 0.1), t, { color: q.c.blue, r: 3.5 });
    q.stems(ns.map((n) => n + 0.1), x, { color: q.c.green, r: 3.5 });
  });
  q.onDrag = (wx, wy) => {
    const n = Math.max(0, Math.min(7, Math.round(wx)));
    x[n] = Math.max(-2.4, Math.min(2.4, Math.round(wy * 4) / 4));
    // Keep the unshifted copy in step, so the shift slider moves what you drew.
    base[(((n - shift) % 8) + 8) % 8] = x[n];
    xShape = null;
    xSeg.set(null);
    update();
  };
  const f3 = figure({ x: [-0.6, 7.6], y: [-6, 6], aspect: 3.2, xTicks: 1, vAxis: false, cap: "Each sample's product. The dot product is their sum." });
  const r = f3.plot;
  r.draw((r) => {
    const prod = ns.map((n) => t[n] * x[n]);
    r.stems(ns, prod, { color: r.c.accent, r: 3.5 });
  });

  const tSeg = segmented({ label: "Template", value: tShape, options: Object.keys(SHAPES).map((k) => [k, k]),
    onChange: (v) => { tShape = v; t.splice(0, 8, ...SHAPES[v]); update(); } });
  const xSeg = segmented({ label: "Signal", value: xShape, options: Object.keys(SHAPES).map((k) => [k, k]),
    onChange: (v) => { xShape = v; base.splice(0, 8, ...SHAPES[v]); applyShift(); update(); } });
  const sh = slider({ label: "Slide the signal", min: 0, max: 7, step: 1, value: 0, format: (v) => `${v} step${v === 1 ? "" : "s"}`,
    onInput: (v) => { shift = v; applyShift(); update(); } });
  function applyShift() { for (let n = 0; n < 8; n++) x[n] = base[(((n - shift) % 8) + 8) % 8]; }

  const score = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("How alike are two signals?", f2.el, f3.el,
    controls(
      el("div", { class: "ctl" }, el("span", { class: "lbl", text: "Template" }), tSeg.el),
      el("div", { class: "ctl" }, el("span", { class: "lbl", text: "Signal" }), xSeg.el),
      sh.el),
    score));

  root.append(tryIt([
    "Template and signal both “wave”, no slide: every product is positive, and the dot product is as big as it gets.",
    "Slide the wave 2 steps: it's now a quarter-cycle off, and the products cancel to 0. A sine and a cosine are orthogonal in the same way.",
    "Slide it 4 steps: it's upside down, and the dot product is as negative as it gets.",
    "Try template “zigzag” against signal “bump”. They have almost nothing in common, so the dot product is near 0.",
  ]));

  const m = mathPanel([
    { tex: "a \\cdot b = a_1 b_1 + a_2 b_2 = |a|\\,|b|\\cos\\theta", note: "The same number two ways: entry by entry, or from the lengths and the angle." },
    { id: "dot", tex: "" },
    { tex: "p = \\frac{a \\cdot b}{a \\cdot a}\\, a", note: "b's shadow on the line through a. The fraction is <i>how many a's</i> fit in the shadow." },
    { id: "proj", tex: "" },
    { tex: "x \\cdot t = \\sum_{n=0}^{7} x_n t_n,\\qquad \\cos\\theta = \\frac{x \\cdot t}{|x|\\,|t|}", note: "For signals, the angle still exists. Its cosine is 1 for the same shape, 0 for nothing in common, −1 for the same shape upside down." },
    { id: "sig", tex: "" },
  ], [
    ["a,\\ b", "the two arrows you drag"],
    ["a_1,\\ a_2", "the entries of a: across and up"],
    ["|a|", "the length of a, which is √(a · a)"],
    ["\\theta", "the angle between the two vectors"],
    ["p", "the projection of b onto a: the point on a's line closest to b"],
    ["x,\\ t", "the signal and the template, eight numbers each"],
    ["x_n,\\ t_n", "their values at position n"],
    ["\\textstyle\\sum", "add up the terms, here for n = 0 to 7"],
  ]);
  root.append(m.el);
  root.append(upNext("a matrix takes every vector somewhere new. Each output entry is a dot product of a row with the input."));

  function update() {
    const d = dot2(a, b), th = angle2(a, b);
    const pr = project(b, a);
    m.set("dot", `${num(a[0])} \\cdot ${num(b[0])} + ${num(a[1])} \\cdot ${num(b[1])} = ${num(d)} = ${num(len2(a))} \\cdot ${num(len2(b))} \\cdot \\cos ${Number.isFinite(th) ? num((th * 180) / Math.PI, 1) : "\\text{--}"}^\\circ`);
    m.set("proj", `p = \\frac{${num(d)}}{${num(dot2(a, a))}} ${vec(a, 2)} = ${vec(pr, 2)}`);
    const dx = dotN(x, t), nx = normN(x), nt = normN(t);
    m.set("sig", `x \\cdot t = ${num(dx)},\\qquad \\cos\\theta = ${nx > 0 && nt > 0 ? num(dx / (nx * nt)) : "\\text{--}"}`);
    status.textContent = !(len2(a) > 0 && len2(b) > 0)
      ? "One of the vectors is zero, so there's no angle."
      : Math.abs(d) < 1e-9
        ? `a · b = 0: a and b are at right angles (orthogonal).`
        : d > 0
          ? `a · b = ${fmt(d)}: positive, so the angle is under 90° and they point roughly the same way.`
          : `a · b = ${fmt(d)}: negative, so the angle is over 90° and they point roughly apart.`;
    const c = nx > 0 && nt > 0 ? dx / (nx * nt) : 0;
    score.textContent = `Dot product ${fmt(dx)}. ${Math.abs(c) > 0.95 ? (c > 0 ? "Almost the same shape." : "The same shape, upside down.") : Math.abs(c) < 0.1 ? "Almost nothing in common." : c > 0 ? "Partly alike." : "Partly opposite."}`;
    p.request(); q.request(); r.request();
  }
  update();

  return { destroy() { p.destroy(); q.destroy(); r.destroy(); } };
}
