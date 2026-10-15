// Lesson 3: a matrix moves space. Drag where (1, 0) and (0, 1) land and the
// whole plane follows, house and all. Then one vector: A x is a combination
// of A's columns.

import { figure } from "../plot.js";
import { button, controls, el, fmt, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, mat, num, vec } from "../tex.js";
import { det2, fromCols, mulMV } from "./linalg-math.js";

// A house with its door on the left, so a mirror image is easy to spot.
const HOUSE = [[-0.7, -0.6], [0.7, -0.6], [0.7, 0.35], [0, 1.05], [-0.7, 0.35]];
const DOOR = [[-0.5, -0.6], [-0.2, -0.6], [-0.2, -0.05], [-0.5, -0.05]];
const WINDOW = [[0.15, -0.1], [0.5, -0.1], [0.5, 0.2], [0.15, 0.2]];

const PRESETS = [
  ["Do nothing", [1, 0], [0, 1]],
  ["Rotate 30°", [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)], [-Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)]],
  ["Stretch", [2, 0], [0, 0.6]],
  ["Shear", [1, 0], [1, 1]],
  ["Mirror", [-1, 0], [0, 1]],
  ["Flatten", [1.5, 0.75], [-1, -0.5]],
];

export function mount(root) {
  const a1 = [1.5, 0.5], a2 = [0.5, 1.25];
  let t = 1;
  const xv = [1, 1];

  root.append(prose(`
    <p>A 2×2 <b>matrix</b> is a machine that takes every point of the plane somewhere new. You only need to know two things to know the whole machine: where it sends ${inl("(1, 0)")} and where it sends ${inl("(0, 1)")}. Those two landing spots are the matrix's <b>columns</b>.</p>
    <p>Everything else follows, because every vector is a combination of ${inl("(1, 0)")} and ${inl("(0, 1)")}, and a matrix keeps combinations as combinations. Grid lines stay straight, stay evenly spaced, and stay parallel. That's what <b>linear</b> means.</p>`));

  /* ---------- Figure 1: the house ---------- */
  const f1 = figure({ x: [-3.5, 3.5], y: [-3, 3], equal: true, aspect: 1.35, cap: "Drag the two column tips. Faint: before. Solid: after." });
  const p = f1.plot;
  const cur = () => {
    // Part of the way from "do nothing" to A, for the morph slider.
    const c1 = [1 + t * (a1[0] - 1), t * a1[1]];
    const c2 = [t * a2[0], 1 + t * (a2[1] - 1)];
    return fromCols(c1, c2);
  };
  p.draw((p) => {
    const A = cur();
    const map = (pts) => pts.map((q) => mulMV(A, q));
    // The transformed grid.
    for (let i = -6; i <= 6; i++) {
      p.path(map([[i, -6], [i, 6]]), { color: p.c.lineStrong, width: 1, alpha: 0.35 });
      p.path(map([[-6, i], [6, i]]), { color: p.c.lineStrong, width: 1, alpha: 0.35 });
    }
    // The unit square and where it lands: its area is |det A|.
    p.path(map([[0, 0], [1, 0], [1, 1], [0, 1]]), { close: true, fill: p.c.gold, width: 0, alpha: 0.18 });
    p.path(HOUSE, { close: true, color: p.c.fgSubtle, width: 1.5, dash: [4, 4] });
    p.path(map(HOUSE), { close: true, color: p.c.fg, width: 2.5, fill: p.c.raised, alpha: 0.95 });
    p.path(map(DOOR), { close: true, color: p.c.accent, width: 2, fill: p.c.accent, alpha: 0.85 });
    p.path(map(WINDOW), { close: true, color: p.c.blue, width: 2 });
    const c1 = [A[0][0], A[1][0]], c2 = [A[0][1], A[1][1]];
    p.arrow(0, 0, c1[0], c1[1], { color: p.c.blue });
    p.arrow(0, 0, c2[0], c2[1], { color: p.c.green });
    p.text("1st column", c1[0], c1[1], { color: p.c.blue, dx: 10, dy: 14, size: 12 });
    p.text("2nd column", c2[0], c2[1], { color: p.c.green, dx: 10, dy: -12, size: 12 });
  });
  const snap = (v) => Math.round(v * 4) / 4;
  const live = () => t === 1;
  p.handle({ get: () => a1, set: (x, y) => { a1[0] = snap(x); a1[1] = snap(y); update(); }, color: (c) => c.blue, r: 7, visible: live });
  p.handle({ get: () => a2, set: (x, y) => { a2[0] = snap(x); a2[1] = snap(y); update(); }, color: (c) => c.green, r: 7, visible: live });

  const morph = slider({ label: "From doing nothing to A", min: 0, max: 1, step: 0.01, value: 1, format: (v) => `${Math.round(v * 100)}%`,
    onInput: (v) => { t = v; update(); } });
  const presets = el("div", { class: "btn-row" }, ...PRESETS.map(([name, c1, c2]) => button(name, () => {
    a1[0] = c1[0]; a1[1] = c1[1]; a2[0] = c2[0]; a2[1] = c2[1];
    t = 1; morph.set(1); update();
  })));
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Transform a house", f1.el,
    legend([["--blue", "where (1, 0) lands"], ["--green", "where (0, 1) lands"], ["--gold", "the unit square, after"]]),
    presets, controls(morph.el), status));

  root.append(tryIt([
    "Press “Shear”. The house leans over, but its floor stays put: (1, 0) didn't move.",
    "Press “Mirror”. The door jumps to the right side, and the determinant goes negative. A negative determinant means the plane got flipped over.",
    "Press “Flatten”. Both columns lie on one line, the house squashes flat, and the determinant is 0. No matrix can undo that, because different points landed on the same spot.",
    "Drag the morph slider back and forth to watch the plane slide from where it started to where A puts it.",
  ]));

  /* ---------- Figure 2: one vector ---------- */
  root.append(prose(`
    <p>Follow one vector ${inl("x = (x_1, x_2)")} through the machine. It's ${inl("x_1")} steps along ${inl("(1, 0)")} plus ${inl("x_2")} steps along ${inl("(0, 1)")}, so after the matrix it's ${inl("x_1")} steps along the first column plus ${inl("x_2")} steps along the second. That's all <b>matrix times vector</b> is: a linear combination of the columns, with the vector's entries as the amounts.</p>`));
  const f2 = figure({ x: [-3, 3], y: [-3, 3], equal: true, aspect: 1, cap: "Before: drag x." });
  const f3 = figure({ x: [-4, 4], y: [-4, 4], equal: true, aspect: 1, cap: "After: A x, built from the columns." });
  const q = f2.plot, r = f3.plot;
  q.draw((q) => {
    q.arrow(0, 0, xv[0], 0, { color: q.c.blue, width: 2, dash: [5, 4], alpha: 0.7 });
    q.arrow(xv[0], 0, xv[0], xv[1], { color: q.c.green, width: 2, dash: [5, 4], alpha: 0.7 });
    q.arrow(0, 0, xv[0], xv[1], { color: q.c.accent, width: 3 });
    q.text("x", xv[0], xv[1], { color: q.c.accent, dx: 10, dy: -12 });
  });
  q.handle({ get: () => xv, set: (x, y) => { xv[0] = snap(x); xv[1] = snap(y); update(); }, color: (c) => c.accent, r: 7 });
  r.draw((r) => {
    const s1 = [xv[0] * a1[0], xv[0] * a1[1]];
    const y = mulMV(fromCols(a1, a2), xv);
    r.arrow(0, 0, s1[0], s1[1], { color: r.c.blue, width: 2, dash: [5, 4], alpha: 0.7 });
    r.arrow(s1[0], s1[1], y[0], y[1], { color: r.c.green, width: 2, dash: [5, 4], alpha: 0.7 });
    r.arrow(0, 0, y[0], y[1], { color: r.c.accent, width: 3 });
    r.text("Ax", y[0], y[1], { color: r.c.accent, dx: 10, dy: -12 });
  });
  root.append(panel("Where does one vector go?", el("div", { class: "fig-row" }, f2.el, f3.el),
    legend([["--blue", "x₁ times the first column"], ["--green", "x₂ times the second column"], ["--accent", "x and A x"]])));

  const m = mathPanel([
    { tex: "A = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = \\begin{bmatrix} | & | \\\\ a_1 & a_2 \\\\ | & | \\end{bmatrix}", note: "The columns are where (1, 0) and (0, 1) land." },
    { id: "A", tex: "" },
    { tex: "A x = x_1 a_1 + x_2 a_2", note: "Matrix times vector: a combination of the columns." },
    { id: "Ax", tex: "" },
    { tex: "A x = \\begin{bmatrix} a x_1 + b x_2 \\\\ c x_1 + d x_2 \\end{bmatrix}", note: "The same thing read by rows: each entry is a dot product of a row of A with x." },
    { tex: "\\det A = ad - bc", note: "How much areas grow. The unit square lands on a shape with area |det A|. Negative means the plane was flipped over; zero means it was flattened." },
    { id: "det", tex: "" },
  ], [
    ["A", "the matrix: the machine that moves the plane"],
    ["a,\\ b,\\ c,\\ d", "the four entries of A, row by row"],
    ["a_1,\\ a_2", "A's columns: where (1, 0) and (0, 1) land"],
    ["x", "the vector going in"],
    ["x_1,\\ x_2", "x's entries, which become the amounts of each column"],
    ["A x", "where x comes out"],
    ["\\det A", "the determinant: the area factor, with a sign for flips"],
  ]);
  root.append(m.el);
  root.append(upNext("the columns don't have to be (1, 0) and (0, 1). Any two directions can be your grid. That's a change of basis."));

  function update() {
    const A = fromCols(a1, a2);
    const d = det2(A);
    m.set("A", `A = ${mat(A, 2)}`);
    const y = mulMV(A, xv);
    m.set("Ax", `${num(xv[0])} ${vec(a1, 2)} + ${num(xv[1])} ${vec(a2, 2)} = ${vec(y, 2)}`);
    m.set("det", `\\det A = ${num(A[0][0])} \\cdot ${num(A[1][1])} - ${num(A[0][1])} \\cdot ${num(A[1][0])} = ${num(d)}`);
    status.textContent = Math.abs(d) < 1e-9
      ? "det A = 0: the plane is squashed onto a line (or a point). Nothing can undo this."
      : d < 0
        ? `det A = ${fmt(d)}: areas scale by ${fmt(-d)}, and the plane is flipped over (look at the door).`
        : `det A = ${fmt(d)}: every area is multiplied by ${fmt(d)}.`;
    p.request(); q.request(); r.request();
  }
  update();

  return { destroy() { p.destroy(); q.destroy(); r.destroy(); } };
}
