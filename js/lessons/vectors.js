// Lesson 1: vectors and linear combinations. Drag v and w, slide c and d,
// and see c v + d w. Then the same idea with eight numbers: a signal is a
// combination of unit impulses.

import { figure } from "../plot.js";
import { check, controls, el, fmt, mathPanel, panel, prose, slider, tryIt, upNext, legend } from "../ui.js";
import { inl, num, vec } from "../tex.js";

export function mount(root) {
  const v = [2, 1], w = [-0.5, 1.5];
  let c = 1, d = 1;

  root.append(prose(`
    <p>A vector is a list of numbers. Two numbers, like ${inl("v = (2, 1)")}, can be drawn as an arrow: 2 across, 1 up. Three numbers make an arrow in 3D. A thousand numbers can't be drawn as an arrow, but they're still a vector, and everything on this page still works for them.</p>
    <p>There are only two things you're allowed to do with vectors: <b>scale</b> one (multiply every number by the same amount) and <b>add</b> two (add them number by number). Do both and you get a <b>linear combination</b>, ${inl("c\\,v + d\\,w")}. Almost everything in this course is a linear combination of something.</p>`));

  /* ---------- Figure 1: c v + d w ---------- */
  const f1 = figure({ x: [-4, 4], y: [-3, 3], equal: true, aspect: 1.4, cap: "Drag the tips of v and w. The orange arrow is c v + d w." });
  const p = f1.plot;
  let showSpan = false;
  p.draw((p) => {
    const cv = [c * v[0], c * v[1]], sum = [cv[0] + d * w[0], cv[1] + d * w[1]];
    if (showSpan) {
      // Every combination with whole-number c and d.
      for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
        const x = i * v[0] + j * w[0], y = i * v[1] + j * w[1];
        if (Math.abs(x) < 6 && Math.abs(y) < 5) p.dot(x, y, { r: 2.5, color: p.c.lineStrong });
      }
    }
    // c v, then d w from its tip: the two sides of the parallelogram.
    p.arrow(0, 0, cv[0], cv[1], { color: p.c.blue, width: 2, dash: [5, 4], alpha: 0.7 });
    p.arrow(cv[0], cv[1], sum[0], sum[1], { color: p.c.green, width: 2, dash: [5, 4], alpha: 0.7 });
    p.arrow(0, 0, v[0], v[1], { color: p.c.blue });
    p.arrow(0, 0, w[0], w[1], { color: p.c.green });
    p.arrow(0, 0, sum[0], sum[1], { color: p.c.accent, width: 3 });
    p.text("v", v[0], v[1], { color: p.c.blue, dx: 10, dy: -10 });
    p.text("w", w[0], w[1], { color: p.c.green, dx: 10, dy: -10 });
    p.text("cv + dw", sum[0], sum[1], { color: p.c.accent, dx: 10, dy: 12 });
  });
  const snap = (x) => Math.round(x * 4) / 4;
  p.handle({ get: () => v, set: (x, y) => { v[0] = snap(x); v[1] = snap(y); update(); }, color: (c) => c.blue, r: 7 });
  p.handle({ get: () => w, set: (x, y) => { w[0] = snap(x); w[1] = snap(y); update(); }, color: (c) => c.green, r: 7 });

  const sc = slider({ label: "c", min: -2, max: 2, step: 0.05, value: c, onInput: (x) => { c = x; update(); } });
  const sd = slider({ label: "d", min: -2, max: 2, step: 0.05, value: d, onInput: (x) => { d = x; update(); } });
  const span = check({ label: "Show every whole-number combination", onChange: (on) => { showSpan = on; p.request(); } });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });

  root.append(panel("Scale and add",
    f1.el,
    legend([["--blue", "v and c v"], ["--green", "w and d w"], ["--accent", "c v + d w"]]),
    controls(sc.el, sd.el, span.el),
    status));

  root.append(tryIt([
    "Set c = 1 and d = 1. The orange arrow goes along v, then along w: that's the parallelogram rule.",
    "Turn on “every whole-number combination”. The dots fill the plane in a slanted grid.",
    "Drag w until it lies along v. Now every combination stays on one line. Two vectors pointing the same way only reach a line.",
  ]));

  /* ---------- Figure 2: a signal is a combination of impulses ---------- */
  root.append(prose(`
    <p>Now take eight numbers instead of two. You can't draw them as one arrow, so draw each number as a stick at its position: that's a <b>signal</b>. It's still a vector, and it's still a linear combination: eight amounts of the eight <b>unit impulses</b> ${inl("e_0, e_1, \\dots, e_7")}, where ${inl("e_n")} is 1 at position ${inl("n")} and 0 everywhere else.</p>
    <p>That's the plainest way to build a signal, one impulse at a time. The Fourier transform will build the same signal out of waves instead. Same vector, different building blocks.</p>`));

  const x = [0.5, 1.5, 2, 1, -0.5, -1.5, -1, 0.25];
  let picked = 3;
  const f2 = figure({ x: [-0.6, 7.6], y: [-2.5, 2.5], aspect: 2.2, xTicks: 1, vAxis: false, cap: "Drag up or down on the plot to set each value. Tap a stick to see its impulse." });
  const q = f2.plot;
  q.draw((q) => {
    const ns = x.map((_, i) => i);
    // The picked impulse, scaled: x[n] e_n.
    q.stems([picked], [x[picked]], { color: q.c.accent, r: 6, width: 4, alpha: 0.35 });
    q.stems(ns, x, { color: q.c.blue });
    q.text(`${fmt(x[picked], 2)} · e${picked}`, picked, x[picked], { color: q.c.accent, dx: 10, dy: x[picked] >= 0 ? -12 : 12 });
  });
  q.onDrag = (wx, wy) => {
    const n = Math.max(0, Math.min(7, Math.round(wx)));
    picked = n;
    x[n] = Math.max(-2.4, Math.min(2.4, Math.round(wy * 4) / 4));
    update();
  };
  const m = mathPanel([
    { tex: "c\\,v + d\\,w = c \\begin{bmatrix} v_1 \\\\ v_2 \\end{bmatrix} + d \\begin{bmatrix} w_1 \\\\ w_2 \\end{bmatrix} = \\begin{bmatrix} c v_1 + d w_1 \\\\ c v_2 + d w_2 \\end{bmatrix}",
      note: "Scale each vector, then add them one entry at a time." },
    { id: "combo", tex: "" },
    { tex: "x = x_0 e_0 + x_1 e_1 + \\cdots + x_7 e_7 = \\sum_{n=0}^{7} x_n\\, e_n",
      note: "A signal of eight numbers, built from the eight unit impulses. The amount of each impulse is just the value at that position." },
    { id: "signal", tex: "" },
  ], [
    ["v,\\ w", "vectors: lists of numbers, drawn as arrows when there are two or three"],
    ["c,\\ d", "scalars: plain numbers that stretch, shrink or flip a vector"],
    ["v_1,\\ v_2", "the entries of v: how far across and how far up"],
    ["e_n", "the unit impulse at position n: 1 there, 0 everywhere else"],
    ["x_n", "the signal's value at position n, which is also how much of e_n it uses"],
    ["\\textstyle\\sum", "add up the terms, here for n = 0 to 7"],
  ]);
  root.append(panel("A signal is a combination too", f2.el), m.el);
  root.append(upNext("dot products, which measure how much two vectors point the same way. That's the tool for finding the amount of each building block."));

  function update() {
    const cv = [c * v[0] + d * w[0], c * v[1] + d * w[1]];
    m.set("combo", `${num(c)} ${vec([v[0], v[1]], 2)} + ${num(d)} ${vec([w[0], w[1]], 2)} = ${vec(cv, 2)}`);
    const terms = x.map((xi, i) => `${num(xi)}\\,e_${i}`);
    m.set("signal", `x = ${terms.slice(0, 4).join(" + ")} + \\cdots`.replace(/\+ -/g, "- "));
    const cross = v[0] * w[1] - v[1] * w[0];
    status.textContent = Math.abs(cross) < 1e-9
      ? "v and w lie on the same line, so their combinations only reach that line."
      : "v and w point in different directions, so their combinations reach every point in the plane.";
    p.request();
    q.request();
  }
  update();

  return { destroy() { p.destroy(); q.destroy(); } };
}
