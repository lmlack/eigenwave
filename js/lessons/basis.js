// Lesson 4: bases and change of basis. Drag two basis vectors to draw a
// skewed grid; the same arrow x gets new coordinates in it, solved live.

import { figure } from "../plot.js";
import { check, controls, el, fmt, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, mat, num, vec } from "../tex.js";
import { det2, fromCols, inv2, solve2 } from "./linalg-math.js";

export function mount(root) {
  const b1 = [1.5, 0.5], b2 = [-0.5, 1], x = [2, 2];
  let t = 1, showStd = false;

  root.append(prose(`
    <p>So far every vector has been written in the usual grid: ${inl("x = (2, 2)")} means 2 steps along ${inl("(1, 0)")} and 2 steps along ${inl("(0, 1)")}. Those two are the <b>standard basis</b>. Nothing makes them special except habit.</p>
    <p>Any two vectors that don't lie on one line can be a <b>basis</b> instead. They draw their own grid, slanted and stretched, and every point of the plane still sits somewhere on it. The arrow ${inl("x")} doesn't move. Only the numbers we use to describe it change. Those new numbers are ${inl("x")}'s <b>coordinates</b> in the new basis.</p>`));

  const f = figure({ x: [-4, 4], y: [-3, 3.2], equal: true, aspect: 1.35, cap: "Drag b₁, b₂ and x. The slanted grid is the one b₁ and b₂ draw." });
  const p = f.plot;
  const cur = () => [
    [1 + t * (b1[0] - 1), t * b1[1]],
    [t * b2[0], 1 + t * (b2[1] - 1)],
  ];
  p.draw((p) => {
    const [u, v] = cur();
    const B = fromCols(u, v);
    const ok = Math.abs(det2(B)) > 1e-9;
    if (ok) {
      for (let i = -8; i <= 8; i++) {
        p.line(i * u[0] - 8 * v[0], i * u[1] - 8 * v[1], i * u[0] + 8 * v[0], i * u[1] + 8 * v[1], { color: p.c.blue, width: 1, alpha: 0.28 });
        p.line(i * v[0] - 8 * u[0], i * v[1] - 8 * u[1], i * v[0] + 8 * u[0], i * v[1] + 8 * u[1], { color: p.c.green, width: 1, alpha: 0.28 });
      }
    }
    if (showStd) {
      p.arrow(0, 0, x[0], 0, { color: p.c.fgSubtle, width: 2, dash: [3, 4] });
      p.arrow(x[0], 0, x[0], x[1], { color: p.c.fgSubtle, width: 2, dash: [3, 4] });
    }
    const c = ok ? solve2(B, x) : null;
    if (c) {
      const s1 = [c[0] * u[0], c[0] * u[1]];
      p.arrow(0, 0, s1[0], s1[1], { color: p.c.blue, width: 2.5, dash: [6, 4] });
      p.arrow(s1[0], s1[1], x[0], x[1], { color: p.c.green, width: 2.5, dash: [6, 4] });
    }
    p.arrow(0, 0, u[0], u[1], { color: p.c.blue, width: 3 });
    p.arrow(0, 0, v[0], v[1], { color: p.c.green, width: 3 });
    p.arrow(0, 0, x[0], x[1], { color: p.c.accent, width: 3 });
    p.text("b₁", u[0], u[1], { color: p.c.blue, dx: 10, dy: 12 });
    p.text("b₂", v[0], v[1], { color: p.c.green, dx: -22, dy: -10 });
    p.text("x", x[0], x[1], { color: p.c.accent, dx: 10, dy: -12 });
  });
  const snap = (v) => Math.round(v * 4) / 4;
  const live = () => t === 1;
  p.handle({ get: () => b1, set: (a, b) => { b1[0] = snap(a); b1[1] = snap(b); update(); }, color: (c) => c.blue, r: 7, visible: live });
  p.handle({ get: () => b2, set: (a, b) => { b2[0] = snap(a); b2[1] = snap(b); update(); }, color: (c) => c.green, r: 7, visible: live });
  p.handle({ get: () => x, set: (a, b) => { x[0] = snap(a); x[1] = snap(b); update(); }, color: (c) => c.accent, r: 7 });

  const morph = slider({ label: "From the standard grid to b₁, b₂", min: 0, max: 1, step: 0.01, value: 1, format: (v) => `${Math.round(v * 100)}%`,
    onInput: (v) => { t = v; update(); } });
  const std = check({ label: "Also show x's standard coordinates", onChange: (on) => { showStd = on; p.request(); } });
  const readout = el("div", { class: "fig-row", style: "margin-top:12px" });
  const status = el("p", { class: "small", style: "margin:8px 0 0" });
  root.append(panel("Same arrow, new grid", f.el,
    legend([["--blue", "b₁ and c₁ b₁"], ["--green", "b₂ and c₂ b₂"], ["--accent", "x"]]),
    controls(morph.el, std.el), readout, status));

  root.append(tryIt([
    "Drag x onto a crossing of the slanted grid. Its new coordinates come out as whole numbers.",
    "Slide the morph to 0% and back. The grid bends from square to slanted, x stays exactly where it is, and its coordinates change.",
    "Drag b₂ onto the line through b₁. The grid collapses and there's no answer: two vectors on one line can't reach every point, so they aren't a basis.",
    "Make b₁ = (2, 0) and b₂ = (0, 2). Every coordinate is halved, because each step is twice as long.",
  ]));

  root.append(prose(`
    <p>Finding the new coordinates means solving ${inl("c_1 b_1 + c_2 b_2 = x")}. Put ${inl("b_1")} and ${inl("b_2")} side by side as the columns of a matrix ${inl("B")}, and that's ${inl("B c = x")}. So ${inl("c = B^{-1} x")}: the inverse matrix converts standard coordinates into the new ones.</p>
    <p>That's the whole story of the Fourier transform, one size up. A signal has standard coordinates: its values, one per sample. The Fourier transform solves for its coordinates in a basis made of waves. In two lessons you'll see a basis where you don't need ${inl("B^{-1}")} at all.</p>`));

  const m = mathPanel([
    { tex: "x = c_1 b_1 + c_2 b_2", note: "x as a combination of the new basis vectors. The amounts c₁ and c₂ are its new coordinates." },
    { tex: "B c = x,\\qquad B = \\begin{bmatrix} | & | \\\\ b_1 & b_2 \\\\ | & | \\end{bmatrix}", note: "The same equation as a matrix: B's columns are the basis vectors." },
    { id: "B", tex: "" },
    { tex: "c = B^{-1} x", note: "Solve for the coordinates. B⁻¹ exists only when det B ≠ 0, which is when b₁ and b₂ don't lie on one line." },
    { id: "c", tex: "" },
  ], [
    ["b_1,\\ b_2", "the new basis vectors"],
    ["x", "the arrow being described; it never moves"],
    ["c_1,\\ c_2", "x's coordinates in the new basis: how many of b₁ and of b₂"],
    ["B", "the matrix with b₁ and b₂ as its columns"],
    ["c", "the coordinates as one vector, (c₁, c₂)"],
    ["B^{-1}", "the inverse of B: undoes what B does"],
    ["\\det B", "the determinant of B; zero means the basis has collapsed"],
  ]);
  root.append(m.el);
  root.append(upNext("bases at right angles, where each coordinate is a single dot product and you never need B⁻¹."));

  function update() {
    // Partway through the morph, the numbers follow the grid that's drawn.
    const B = fromCols(...cur());
    const d = det2(B);
    const c = solve2(B, x);
    m.set("B", `B = ${mat(B, 2)},\\quad \\det B = ${num(d)}`);
    const I = inv2(B);
    m.set("c", I ? `c = ${mat(I, 2)} ${vec(x, 2)} = ${vec(c, 2)}` : "c = \\text{no solution: } \\det B = 0");
    readout.replaceChildren(
      el("p", { class: "small mono", style: "margin:0", text: `Standard: x = ${fmt(x[0])}·(1, 0) + ${fmt(x[1])}·(0, 1)` }),
      el("p", { class: "small mono", style: "margin:0", text: c ? `New basis: x = ${fmt(c[0])}·b₁ + ${fmt(c[1])}·b₂` : "New basis: no coordinates" }));
    status.textContent = !c
      ? "b₁ and b₂ lie on one line, so they aren't a basis: most points can't be reached."
      : "b₁ and b₂ point different ways, so they're a basis: every point has exactly one pair of coordinates.";
    p.request();
  }
  update();

  return { destroy() { p.destroy(); } };
}
