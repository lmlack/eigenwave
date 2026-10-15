// Lesson 8: roots of unity and complex vectors. The N roots of 1 on the
// circle, stepping around by ω, summing to zero. Then the complex inner
// product, and the Fourier vectors drawn as rows of clock hands, whose inner
// products close into loops unless the two vectors are the same.

import { figure } from "../plot.js";
import { button, check, controls, el, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { TAU } from "../cmath.js";
import { fourierTerms, rootsOfUnity } from "./roots-math.js";

export function mount(root) {
  let N = 8, power = 1, chain = false;

  root.append(prose(`
    <p>Lesson 7 showed that multiplying by a number of length 1 is a pure turn. Pick the turn that's exactly one ${inl("N")}th of the way around: ${inl("\\omega = e^{2\\pi i/N}")}. Multiply by it ${inl("N")} times and you're back where you started, so ${inl("\\omega^N = 1")}.</p>
    <p>The powers ${inl("1, \\omega, \\omega^2, \\dots, \\omega^{N-1}")} are the <b>${inl("N")}th roots of unity</b>: ${inl("N")} points spaced evenly around the unit circle. Each one solves ${inl("z^N = 1")}. The discrete Fourier transform is built from them.</p>`));

  /* ---------- Figure 1: the roots ---------- */
  const f1 = figure({ x: [-1.5, 1.5], y: [-1.5, 1.5], equal: true, aspect: 1.25, ticks: false,
    cap: "The N roots of unity. The orange arrow is ω to the power shown. Turn on the chain to add them all up." });
  const p = f1.plot;
  p.draw((p) => {
    p.circle(0, 0, 1, { color: p.c.lineStrong, dash: [4, 4], width: 1 });
    const pts = rootsOfUnity(N);
    if (chain) {
      // Head to tail: 1, then ω from its tip, then ω², and so on.
      let x = 0, y = 0;
      pts.forEach(([a, b], k) => {
        p.arrow(x, y, x + a * 0.5, y + b * 0.5, { color: k === 0 ? p.c.accent : p.c.purple, width: 2, head: 8, alpha: 0.85 });
        x += a * 0.5; y += b * 0.5;
      });
      p.dot(0, 0, { r: 4, color: p.c.fg });
    }
    pts.forEach(([a, b], k) => {
      p.dot(a, b, { r: k === power % N ? 7 : 5, color: k === power % N ? p.c.accent : p.c.blue });
      if (N <= 16) p.text(k === 0 ? "1" : k === 1 ? "ω" : `ω${sup(k)}`, a * 1.2, b * 1.2, { align: "center", color: p.c.fgMuted, size: 12, weight: 600 });
    });
    if (!chain) {
      const [a, b] = pts[power % N];
      p.arrow(0, 0, a, b, { color: p.c.accent, width: 3 });
    }
  });

  const sN = slider({ label: "N", min: 2, max: 16, step: 1, value: N, format: (v) => String(v), onInput: (v) => { N = v; power = 1; update(); } });
  const stepBtn = button("Multiply by ω", () => { power = (power + 1) % N; update(); }, "solid");
  const chainCheck = check({ label: "Add them head to tail (each drawn at half size)", onChange: (on) => { chain = on; update(); } });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("The N roots of 1", f1.el, controls(sN.el, el("div", { class: "btn-row" }, stepBtn), chainCheck.el), status));

  root.append(tryIt([
    "Press “Multiply by ω” over and over. Each press is the same turn, 1/N of the way round. After N presses you're back at 1.",
    "Turn on the chain. Added head to tail, the roots make a closed polygon, so they add up to zero. Try every N.",
    "Set N = 4. The roots are 1, i, −1, −i: the quarter turns from lesson 7.",
  ]));

  /* ---------- Complex inner product ---------- */
  root.append(prose(`
    <p>Complex vectors need one change to the dot product. For real vectors, ${inl("v \\cdot v")} is the squared length, always positive. Try it on ${inl("v = (1, i)")}: ${inl("1 \\cdot 1 + i \\cdot i = 1 - 1 = 0")}. A vector that isn't zero would have length zero, which makes no sense.</p>
    <p>The fix is to <b>conjugate</b> the first vector (flip the sign of every imaginary part) before multiplying: ${inl("\\langle u, v\\rangle = \\sum \\overline{u_n}\\, v_n")}. Now ${inl("\\langle v, v\\rangle = \\sum |v_n|^2")}, which is real and positive. For ${inl("(1, i)")} it's ${inl("1 + 1 = 2")}. Conjugating a unit-length number turns it backward, so ${inl("\\overline{\\omega^a}\\,\\omega^b = \\omega^{b-a}")}.</p>
    <p>Now build vectors out of the roots. The <b>Fourier vector</b> ${inl("f_k")} has entries ${inl("1, \\omega^k, \\omega^{2k}, \\dots")}: it turns ${inl("k")} steps at a time. Draw each entry as a little clock hand and ${inl("f_k")} is a row of hands spinning at speed ${inl("k")}. That's a wave.</p>`));

  /* ---------- Figure 2: Fourier vectors as clock hands ---------- */
  let M = 8, j = 1, k = 3;
  const f2 = figure({ x: [-0.6, 7.6], y: [-0.6, 7.6], equal: true, aspect: 1.1, axes: false, grid: false,
    cap: "Row k is the Fourier vector f_k: entry n is ω<sup>kn</sup>, drawn as a hand on a clock. Rows j and k are highlighted." });
  const q = f2.plot;
  q.draw((q) => {
    const R = 0.4;
    for (let r = 0; r < M; r++) {
      const y = M - 1 - r;
      const hi = r === j || r === k;
      const col = r === k ? q.c.accent : r === j ? q.c.blue : q.c.fgSubtle;
      q.text(`f${sub(r)}`, -0.55, y, { color: hi ? col : q.c.fgSubtle, size: 12, align: "left" });
      for (let n = 0; n < M; n++) {
        const a = (TAU * r * n) / M;
        q.circle(n + 0.25, y, R, { color: hi ? col : q.c.line, width: hi ? 1.5 : 1 });
        q.line(n + 0.25, y, n + 0.25 + R * Math.cos(a), y + R * Math.sin(a), { color: hi ? col : q.c.fgSubtle, width: hi ? 2.5 : 1.5 });
      }
    }
  });

  /* ---------- Figure 3: ⟨f_j, f_k⟩ head to tail ---------- */
  const f3 = figure({ x: [-1.5, 9], y: [-4, 4], equal: true, aspect: 1.1, ticks: false,
    cap: "The terms of ⟨f_j, f_k⟩, added head to tail. The orange dot is where they end up: the inner product." });
  const g = f3.plot;
  g.draw((g) => {
    const terms = fourierTerms(M, j, k);
    let x = 0, y = 0;
    terms.forEach(([a, b]) => {
      g.arrow(x, y, x + a, y + b, { color: g.c.purple, width: 2.2, head: 9 });
      x += a; y += b;
    });
    g.dot(0, 0, { r: 4, color: g.c.fg });
    if (Math.hypot(x, y) > 1e-6) g.arrow(0, 0, x, y, { color: g.c.accent, width: 3, dash: [6, 4] });
    g.dot(x, y, { r: 5, color: g.c.accent });
  });

  const sM = slider({ label: "N for the vectors", min: 3, max: 12, step: 1, value: M, format: (v) => String(v), onInput: (v) => { M = v; j = Math.min(j, M - 1); k = Math.min(k, M - 1); sj.set(j); sk.set(k); refreshJK(); update(); } });
  const sj = slider({ label: "j (blue row)", min: 0, max: 11, step: 1, value: j, format: (v) => String(v), onInput: (v) => { j = Math.min(v, M - 1); update(); } });
  const sk = slider({ label: "k (orange row)", min: 0, max: 11, step: 1, value: k, format: (v) => String(v), onInput: (v) => { k = Math.min(v, M - 1); update(); } });
  function refreshJK() {
    for (const s of [sj, sk]) s.el.querySelector("input").max = M - 1;
  }
  refreshJK();
  const status2 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Fourier vectors are perpendicular",
    el("div", { class: "fig-row" }, f2.el, f3.el),
    legend([["--blue", "f_j"], ["--accent", "f_k"], ["--purple", "terms of ⟨f_j, f_k⟩"]]),
    controls(sM.el, sj.el, sk.el), status2));

  root.append(tryIt([
    "Pick two different rows. The terms are a set of roots of unity again, so they close into a loop: the inner product is zero. The vectors are perpendicular.",
    "Set j = k. Every term is 1, they line up, and the sum is N: the squared length of f_k.",
    "Try N = 8, j = 0, k = 4. Row 4 flips back and forth every step: the fastest wave N = 8 points can hold.",
  ]));

  /* ---------- The math ---------- */
  const m = mathPanel([
    { tex: "\\omega = e^{2\\pi i/N}, \\qquad \\omega^N = 1",
      note: "One Nth of a full turn. Its powers are the N roots of unity." },
    { id: "omega", tex: "" },
    { tex: "1 + \\omega + \\omega^2 + \\cdots + \\omega^{N-1} = \\frac{1 - \\omega^N}{1 - \\omega} = 0",
      note: "The geometric series. The top is 1 − 1 = 0, and the bottom isn't zero as long as N > 1." },
    { tex: "\\langle u, v\\rangle = \\sum_{n=0}^{N-1} \\overline{u_n}\\, v_n, \\qquad \\langle v, v\\rangle = \\sum_{n=0}^{N-1} |v_n|^2 \\ge 0",
      note: "The complex inner product: conjugate the first vector, then multiply and add." },
    { tex: "f_k = \\big(1,\\ \\omega^k,\\ \\omega^{2k},\\ \\dots,\\ \\omega^{(N-1)k}\\big)" },
    { tex: "\\langle f_j, f_k\\rangle = \\sum_{n=0}^{N-1} \\omega^{(k-j)n} = \\begin{cases} N & j = k \\\\ 0 & j \\ne k \\end{cases}",
      note: "When j ≠ k the terms are roots of unity again, and they add to zero. So the N Fourier vectors are perpendicular, and each has squared length N." },
    { id: "jk", tex: "" },
  ], [
    ["N", "how many points: the roots, and the length of each Fourier vector"],
    ["\\omega", "the turn by 1/N of a circle, e<sup>2πi/N</sup>"],
    ["\\omega^k", "ω multiplied by itself k times: a turn of k steps"],
    ["e^{i\\theta}", "the point at angle θ on the unit circle"],
    ["u,\\ v", "complex vectors with entries u_n, v_n"],
    ["\\overline{u_n}", "the conjugate of u_n: same real part, opposite imaginary part"],
    ["|v_n|", "the length of the complex number v_n"],
    ["\\langle u, v\\rangle", "the inner product of u and v"],
    ["f_k", "the Fourier vector of speed k: entry n is ω<sup>kn</sup>"],
    ["j,\\ k,\\ n", "whole numbers from 0 to N − 1: which vector, and which entry"],
  ]);
  root.append(m.el);
  root.append(upNext("functions are vectors too. A function has infinitely many entries, and the inner product becomes an integral."));

  function update() {
    const pw = power % N;
    const a = (TAU * pw) / N;
    m.set("omega", `N = ${N}: \\quad \\omega^{${pw}} = e^{2\\pi i \\cdot ${pw}/${N}} = ${num(clean(Math.cos(a)))} ${Math.sin(a) < -1e-12 ? "-" : "+"} ${num(clean(Math.abs(Math.sin(a))))}\\,i`);
    const terms = fourierTerms(M, j, k);
    // Rounding leaves 1e-16 crumbs where the answer is exactly zero.
    const s = terms.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]).map(clean);
    m.set("jk", `\\langle f_{${j}}, f_{${k}}\\rangle = ${num(s[0])} ${s[1] < -1e-12 ? "-" : "+"} ${num(Math.abs(s[1]))}\\,i`);
    status.textContent = chain
      ? `The ${N} arrows close up and end where they started: the roots add to zero.`
      : `ω to the power ${pw}: ${pw} of the ${N} equal steps around the circle.`;
    status2.textContent = j === k
      ? `j = k, so every term is 1 and they add to N = ${M}.`
      : `j ≠ k: each term turns ${(((k - j) % M) + M) % M} steps from the one before, so the terms close into a loop and add to 0.`;
    // Room for the chain: a straight line of N when j = k, a loop otherwise.
    q.setRange([-0.6, M - 0.2], [-0.6, M - 0.4]);
    // Frame the chain: from the origin through every partial sum, with a margin.
    let cx = 0, cy = 0, x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    for (const [tx, ty] of terms) {
      cx += tx; cy += ty;
      x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
    }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, half = Math.max(1.5, (x1 - x0) / 2 + 0.8, (y1 - y0) / 2 + 0.8);
    g.setRange([mx - half, mx + half], [my - half, my + half]);
    p.request(); q.request(); g.request();
  }
  update();

  return { destroy() { p.destroy(); q.destroy(); g.destroy(); } };
}

const clean = (v) => (Math.abs(v) < 1e-9 ? 0 : v);
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹", SUB = "₀₁₂₃₄₅₆₇₈₉";
const sup = (k) => String(k).split("").map((d) => SUP[d]).join("");
const sub = (k) => String(k).split("").map((d) => SUB[d]).join("");
