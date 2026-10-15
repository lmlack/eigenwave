// Lesson 5: orthogonal bases. With an orthonormal basis every coefficient is
// one dot product; with a slanted basis, dot products give the wrong amounts.
// Then an 8-sample signal in an orthonormal basis of 8 signals.

import { figure } from "../plot.js";
import { controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num, vec } from "../tex.js";
import { coeffs, cosine8, dot2, dotN, fromCols, haar8, rebuild, solve2 } from "./linalg-math.js";

export function mount(root) {
  const x = [2, 1];
  let phi = 20, gap = 60; // degrees: the orthonormal basis's turn, and the angle between b₁ and b₂

  root.append(prose(`
    <p>Last lesson, finding coordinates meant solving ${inl("B c = x")}, which takes an inverse matrix. There's a kind of basis where you don't need any of that: one whose vectors are at right angles to each other (<b>orthogonal</b>) and each of length 1 (<b>normalized</b>). Together that's an <b>orthonormal</b> basis.</p>
    <p>In an orthonormal basis, each coordinate is just a dot product: how much ${inl("x")} points along ${inl("q_1")} is ${inl("q_1 \\cdot x")}. Each basis vector can measure its own amount without the others getting in the way.</p>`));

  /* ---------- Figure 1: orthonormal vs slanted ---------- */
  const qv = () => {
    const a = (phi * Math.PI) / 180;
    return [[Math.cos(a), Math.sin(a)], [-Math.sin(a), Math.cos(a)]];
  };
  const bv = () => {
    const a = (gap * Math.PI) / 180;
    return [[1, 0], [Math.cos(a), Math.sin(a)]];
  };
  const snap = (v) => Math.round(v * 4) / 4;
  const mk = (cap) => figure({ x: [-3, 3], y: [-2.5, 3], equal: true, aspect: 1.05, cap });
  const fL = mk("Orthonormal: dot products rebuild x exactly.");
  const fR = mk("Slanted: the same recipe misses.");
  const drawBasis = (p, u, v, amounts, exact) => {
    for (let i = -6; i <= 6; i++) {
      p.line(i * u[0] - 6 * v[0], i * u[1] - 6 * v[1], i * u[0] + 6 * v[0], i * u[1] + 6 * v[1], { color: p.c.blue, width: 1, alpha: 0.2 });
      p.line(i * v[0] - 6 * u[0], i * v[1] - 6 * u[1], i * v[0] + 6 * u[0], i * v[1] + 6 * u[1], { color: p.c.green, width: 1, alpha: 0.2 });
    }
    const s1 = [amounts[0] * u[0], amounts[0] * u[1]];
    const y = [s1[0] + amounts[1] * v[0], s1[1] + amounts[1] * v[1]];
    p.arrow(0, 0, s1[0], s1[1], { color: p.c.blue, width: 2, dash: [5, 4] });
    p.arrow(s1[0], s1[1], y[0], y[1], { color: p.c.green, width: 2, dash: [5, 4] });
    p.arrow(0, 0, u[0], u[1], { color: p.c.blue, width: 3 });
    p.arrow(0, 0, v[0], v[1], { color: p.c.green, width: 3 });
    p.arrow(0, 0, x[0], x[1], { color: p.c.accent, width: 3 });
    if (!exact) {
      p.dot(y[0], y[1], { r: 6, color: p.c.purple });
      p.text("rebuilt", y[0], y[1], { color: p.c.purple, align: "right", dx: -10, dy: 14, size: 12 });
    }
  };
  fL.plot.draw((p) => {
    const [q1, q2] = qv();
    drawBasis(p, q1, q2, [dot2(q1, x), dot2(q2, x)], true);
    p.text("q₁", q1[0], q1[1], { color: p.c.blue, dx: 8, dy: 12 });
    p.text("q₂", q2[0], q2[1], { color: p.c.green, dx: -20, dy: -8 });
  });
  fR.plot.draw((p) => {
    const [b1, b2] = bv();
    drawBasis(p, b1, b2, [dot2(b1, x), dot2(b2, x)], false);
    p.text("b₁", b1[0], b1[1], { color: p.c.blue, dx: 8, dy: 12 });
    p.text("b₂", b2[0], b2[1], { color: p.c.green, dx: -20, dy: -8 });
  });
  for (const f of [fL, fR]) {
    f.plot.handle({ get: () => x, set: (a, b) => { x[0] = snap(a); x[1] = snap(b); update(); }, color: (c) => c.accent, r: 7 });
  }
  const sPhi = slider({ label: "Turn q₁ and q₂", min: -90, max: 90, step: 1, value: phi, format: (v) => `${v}°`, onInput: (v) => { phi = v; update(); } });
  const sGap = slider({ label: "Angle between b₁ and b₂", min: 20, max: 160, step: 1, value: gap, format: (v) => `${v}°`, onInput: (v) => { gap = v; update(); } });
  const verdict = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Dot products as coordinates", el("div", { class: "fig-row" }, fL.el, fR.el),
    legend([["--accent", "x (drag it in either picture)"], ["--blue", "first basis vector and its amount"], ["--green", "second basis vector and its amount"], ["--purple", "where the dot products land"]]),
    controls(sPhi.el, sGap.el), verdict));

  root.append(tryIt([
    "Drag x anywhere. On the left the dashed path always ends right on x. On the right it misses.",
    "Turn q₁ and q₂ with the slider. The coordinates change, but the dot products still rebuild x exactly.",
    "Slide the angle between b₁ and b₂ to 90°. The purple dot lands on x: at right angles, the slanted basis stops being slanted and the dot products work.",
  ]));

  /* ---------- Figure 2: a signal in an orthonormal basis ---------- */
  root.append(prose(`
    <p>The same idea works with eight numbers. Below are two orthonormal bases of eight signals each. The <b>Haar</b> basis is made of blocky steps: an average, then differences at coarser and finer scales. The <b>cosine</b> basis is made of waves, from flat to fast. In either one, the amount of each basis signal in your signal is one dot product.</p>
    <p>Keep only the first few amounts and add those pieces back up, and you get an approximation. Keep all eight and you get the signal back exactly. Swap the cosine basis for complex waves and this is the Fourier transform.</p>`));

  const BASES = { haar: haar8(), cosine: cosine8() };
  let which = "cosine", K = 3, picked = 1;
  const sig = [0.5, 1.5, 2, 1.5, 0.5, -0.5, -1, -0.5];
  const ns = [...Array(8).keys()];
  const fS = figure({ x: [-0.6, 7.6], y: [-2.6, 2.6], aspect: 2.2, xTicks: 1, vAxis: false, cap: "Faint: your signal (drag to change it). Blue: rebuilt from the first K pieces. Gold: the piece you picked." });
  const fC = figure({ x: [-0.6, 7.6], y: [-4.5, 4.5], aspect: 2.6, xTicks: 1, vAxis: false, cap: "The amounts c_k, each a dot product. Tap one to see its piece." });
  const ps = fS.plot, pc = fC.plot;
  ps.draw((p) => {
    const B = BASES[which], c = coeffs(B, sig);
    const y = rebuild(B, c, K);
    p.stems(ns.map((n) => n - 0.12), sig, { color: p.c.fgSubtle, alpha: 0.6 });
    p.path(ns.map((n) => [n, y[n]]), { color: p.c.blue, width: 1, alpha: 0.4 });
    p.stems(ns.map((n) => n + 0.12), y, { color: p.c.blue });
    p.path(ns.map((n) => [n, c[picked] * B[picked][n]]), { color: p.c.gold, width: 2.5, dash: [6, 4] });
  });
  ps.onDrag = (wx, wy) => {
    const n = Math.max(0, Math.min(7, Math.round(wx)));
    sig[n] = Math.max(-2.5, Math.min(2.5, Math.round(wy * 4) / 4));
    update();
  };
  pc.draw((p) => {
    const c = coeffs(BASES[which], sig);
    p.rect(K - 0.5, p.y0, 7.6, p.y1, { fill: p.c.raised, alpha: 0.7 });
    p.stems(ns, c, { color: p.c.accent, r: 4 });
    p.dot(picked, c[picked], { r: 7, color: p.c.gold, stroke: p.c.panel });
    p.text(`c${picked} = ${fmt(c[picked])}`, picked, c[picked], { color: p.c.gold, dx: 10, dy: c[picked] >= 0 ? -12 : 12, size: 12 });
  });
  pc.onDrag = (wx) => { picked = Math.max(0, Math.min(7, Math.round(wx))); update(); };

  const seg = segmented({ label: "Basis", value: which, options: [["cosine", "Cosine waves"], ["haar", "Haar steps"]], onChange: (v) => { which = v; update(); } });
  const sK = slider({ label: "Keep the first K pieces", min: 0, max: 8, step: 1, value: K, format: (v) => `K = ${v}`, onInput: (v) => { K = v; update(); } });
  const err = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("A signal in a basis of signals", fS.el, fC.el,
    controls(el("div", { class: "ctl" }, el("span", { class: "lbl", text: "Basis" }), seg.el), sK.el), err));

  root.append(tryIt([
    "Slide K from 0 to 8. Each piece you add brings the blue stems closer, and at K = 8 they match your signal exactly.",
    "Tap different amounts. The gold dashed line is that piece: its basis signal times its amount.",
    "Draw a smooth signal and compare the two bases at K = 3. Cosines get close fast. Draw a sharp step and Haar wins. A good basis is one where a few amounts carry most of the signal.",
  ]));

  const m = mathPanel([
    { tex: "q_i \\cdot q_j = \\begin{cases} 1 & i = j \\\\ 0 & i \\ne j \\end{cases}", note: "Orthonormal: each basis vector has length 1, and each pair is at right angles." },
    { tex: "x = c_1 q_1 + c_2 q_2,\\qquad c_i = q_i \\cdot x", note: "Dot x with q₁: the q₂ term drops out (q₁ · q₂ = 0) and q₁ · q₁ = 1, so you're left with c₁ alone." },
    { id: "ortho", tex: "" },
    { tex: "b_i \\cdot x \\ne c_i \\quad\\text{when } b_1 \\cdot b_2 \\ne 0", note: "In a slanted basis, dotting with b₁ picks up some of the b₂ term too, so you're back to solving B c = x." },
    { id: "slant", tex: "" },
    { tex: "c_k = q_k \\cdot x = \\sum_{n=0}^{7} q_k[n]\\, x[n],\\qquad x \\approx \\sum_{k=0}^{K-1} c_k\\, q_k", note: "Eight dot products give the eight amounts. Keep the first K to approximate." },
    { tex: "\\sum_k c_k^2 = \\sum_n x[n]^2", note: "In an orthonormal basis the energy is the same in both sets of numbers. For Fourier this is called Parseval's theorem." },
    { id: "energy", tex: "" },
  ], [
    ["q_1,\\ q_2", "an orthonormal basis: length 1, at right angles"],
    ["b_1,\\ b_2", "a slanted basis: length 1, but not at right angles"],
    ["x", "the vector or signal being described"],
    ["c_i,\\ c_k", "its coordinates: how much of each basis vector it holds"],
    ["q_k[n]", "the value of the k-th basis signal at sample n"],
    ["x[n]", "the signal's value at sample n"],
    ["K", "how many pieces are kept in the approximation"],
    ["\\textstyle\\sum", "add up the terms"],
  ]);
  root.append(m.el);
  root.append(upNext("eigenvectors: directions a matrix only stretches. They're why waves are the right basis for signals."));

  function update() {
    const [q1, q2] = qv();
    const c1 = dot2(q1, x), c2 = dot2(q2, x);
    m.set("ortho", `c_1 = ${num(c1)},\\ c_2 = ${num(c2)}:\\quad ${num(c1)} ${vec(q1, 2)} + ${num(c2)} ${vec(q2, 2)} = ${vec([c1 * q1[0] + c2 * q2[0], c1 * q1[1] + c2 * q2[1]], 2)}`);
    const [b1, b2] = bv();
    const d1 = dot2(b1, x), d2 = dot2(b2, x);
    const tru = solve2(fromCols(b1, b2), x);
    m.set("slant", `b_1 \\cdot x = ${num(d1)},\\ b_2 \\cdot x = ${num(d2)}\\quad\\text{but really}\\quad c_1 = ${num(tru[0])},\\ c_2 = ${num(tru[1])}`);
    const miss = Math.hypot(d1 * b1[0] + d2 * b2[0] - x[0], d1 * b1[1] + d2 * b2[1] - x[1]);
    verdict.textContent = miss < 0.01
      ? "Both pictures land on x: at 90°, dot products are the right amounts."
      : `On the right, the dot products rebuild a point ${fmt(miss)} away from x. On the left they're exact.`;
    const B = BASES[which], c = coeffs(B, sig), y = rebuild(B, c, K);
    // Rescale the amounts plot in steps, so it doesn't jitter while you drag.
    const lim = Math.max(3, Math.ceil((Math.max(...c.map(Math.abs)) * 1.15) / 1.5) * 1.5);
    if (lim !== pc.y1) pc.setRange(null, [-lim, lim]);
    const e = Math.sqrt(sig.reduce((s, v, n) => s + (v - y[n]) ** 2, 0));
    m.set("energy", `${num(c.reduce((s, v) => s + v * v, 0))} = ${num(dotN(sig, sig))}`);
    err.textContent = K === 8
      ? "All eight pieces: the signal comes back exactly."
      : `With ${K} of 8 pieces, the rebuilt signal is off by ${fmt(e)} in total (the length of the difference).`;
    for (const f of [fL, fR]) f.plot.request();
    ps.request(); pc.request();
  }
  update();

  return { destroy() { fL.plot.destroy(); fR.plot.destroy(); ps.destroy(); pc.destroy(); } };
}
