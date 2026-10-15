// Lesson 6: eigenvectors. Drag x and watch A x; when they line up, x is an
// eigenvector. Apply A over and over and almost any x swings toward the
// dominant eigenvector. Then Strang's "eigenvalues don't quite meet".

import { figure } from "../plot.js";
import { button, controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, mat, num, vec } from "../tex.js";
import { angle2, avoidedPair, det2, eig2, len2, mulMV } from "./linalg-math.js";

const PRESETS = {
  sym: ["Symmetric", [[2, 1], [1, 2]]],
  lean: ["Lopsided", [[1, 1.5], [0.5, 0]]],
  shear: ["Shear", [[1, 1], [0, 1]]],
  rot: ["Rotation", [[0.8, -0.6], [0.6, 0.8]]],
};

export function mount(root) {
  let key = "sym";
  const A = PRESETS.sym[1].map((r) => r.slice());
  const x = [1, 0.3];
  let trail = [];

  root.append(prose(`
    <p>A matrix turns most vectors: ${inl("A x")} points somewhere different from ${inl("x")}. But most matrices have a few special directions that come out pointing the same way they went in, only stretched or shrunk (or flipped). Those are the <b>eigenvectors</b>. The stretch factor is the <b>eigenvalue</b>, ${inl("\\lambda")}: ${inl("A x = \\lambda x")}.</p>
    <p>Along an eigenvector the matrix is just multiplication by a number. That's why they matter: if you can write a vector as a combination of eigenvectors, applying the matrix is easy. Hold onto that. Waves turn out to be the eigenvectors of every time-invariant system, and that's the whole reason the Fourier transform uses them.</p>`));

  /* ---------- Figure 1: x and A x ---------- */
  const f = figure({ x: [-3.2, 3.2], y: [-3, 3], equal: true, aspect: 1.3, cap: "Drag x. The purple arrow is A x. The dashed lines are the eigenvector directions." });
  const p = f.plot;
  p.draw((p) => {
    // The unit circle and where A sends it: an ellipse.
    const circ = [], ell = [];
    for (let i = 0; i <= 120; i++) {
      const t = (2 * Math.PI * i) / 120, u = [Math.cos(t), Math.sin(t)];
      circ.push(u); ell.push(mulMV(A, u));
    }
    p.path(circ, { color: p.c.lineStrong, width: 1.2, dash: [3, 4] });
    p.path(ell, { color: p.c.purple, width: 1.5, alpha: 0.5 });
    const e = eig2(A);
    if (e.real) {
      for (const v of e.vectors) if (v) p.line(-6 * v[0], -6 * v[1], 6 * v[0], 6 * v[1], { color: p.c.gold, width: 2, dash: [8, 6] });
    }
    trail.forEach((v, i) => p.arrow(0, 0, v[0], v[1], { color: p.c.accent, width: 1.5, alpha: 0.15 + (0.5 * (i + 1)) / trail.length }));
    const Ax = mulMV(A, x);
    const lined = isLined(x, Ax);
    p.arrow(0, 0, Ax[0], Ax[1], { color: p.c.purple, width: lined ? 4 : 3 });
    p.arrow(0, 0, x[0], x[1], { color: p.c.accent, width: 3 });
    p.text("x", x[0], x[1], { color: p.c.accent, dx: 10, dy: -12 });
    p.text("Ax", Ax[0], Ax[1], { color: p.c.purple, dx: 10, dy: 14 });
  });
  const snap = (v) => Math.round(v * 20) / 20;
  p.handle({ get: () => x, set: (a, b) => { x[0] = snap(a); x[1] = snap(b); trail = []; update(); }, color: (c) => c.accent, r: 7 });

  const seg = segmented({ label: "Matrix", value: key, options: Object.entries(PRESETS).map(([k, [n]]) => [k, n]),
    onChange: (k) => { key = k; PRESETS[k][1].forEach((r, i) => (A[i] = r.slice())); trail = []; syncSliders(); update(); } });
  const entry = (i, j, name) => slider({ label: name, min: -2, max: 2, step: 0.05, value: A[i][j],
    onInput: (v) => { A[i][j] = v; seg.set(null); trail = []; update(); } });
  const sl = [entry(0, 0, "a (top left)"), entry(0, 1, "b (top right)"), entry(1, 0, "c (bottom left)"), entry(1, 1, "d (bottom right)")];
  const syncSliders = () => { sl[0].set(A[0][0]); sl[1].set(A[0][1]); sl[2].set(A[1][0]); sl[3].set(A[1][1]); };
  const step = button("Apply A again", () => {
    // Power iteration: replace x by A x, scaled back to the length it had, so it stays on screen.
    const Ax = mulMV(A, x), L = len2(Ax);
    if (L < 1e-9) return;
    trail.push(x.slice());
    if (trail.length > 8) trail.shift();
    const s = Math.max(0.5, Math.min(2.5, len2(x))) / L;
    x[0] = Ax[0] * s; x[1] = Ax[1] * s;
    update();
  }, "solid");
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Which directions survive?", f.el,
    legend([["--accent", "x"], ["--purple", "A x, and where A sends the unit circle"], ["--gold", "eigenvector directions"]]),
    el("div", { class: "btn-row", style: "margin-top:10px" }, seg.el, step),
    controls(...sl.map((s) => s.el)), status));

  root.append(tryIt([
    "With “Symmetric”, drag x around the circle until x and A x line up. They do along the two gold lines, and nowhere else.",
    "Start x anywhere and press “Apply A again” a few times. It swings onto the gold line with the bigger eigenvalue. That's called power iteration.",
    "Pick “Rotation”. A x is always turned the same amount from x, so nothing lines up and there are no gold lines. Its eigenvalues are complex numbers, which is where Part 2 picks up.",
    "Pick “Shear”. There's only one gold line: (1, 0) stays put, and every other direction leans over.",
  ]));

  /* ---------- Figure 2: eigenvalues don't quite meet ---------- */
  root.append(prose(`
    <p>Here's a strange fact Strang likes to show. Take the symmetric matrix ${inl("\\begin{bmatrix} a & \\varepsilon \\\\ \\varepsilon & -a \\end{bmatrix}")} and slide ${inl("a")} from negative to positive. With ${inl("\\varepsilon = 0")} its two eigenvalues are just ${inl("a")} and ${inl("-a")}, and they cross at zero. Make ${inl("\\varepsilon")} even a little bit nonzero and they stop crossing: they come close, then veer apart. Their eigenvectors swap roles as they pass.</p>`));
  let aa = -0.6, eps = 0.25;
  const g = figure({ x: [-2, 2], y: [-2.2, 2.2], aspect: 1.8, xLabel: "a", yLabel: "λ", cap: "Both eigenvalues as a changes. Faint: what they'd do with ε = 0." });
  const q = g.plot;
  q.draw((q) => {
    q.fn((t) => t, { color: q.c.fgSubtle, width: 1.2, dash: [4, 4] });
    q.fn((t) => -t, { color: q.c.fgSubtle, width: 1.2, dash: [4, 4] });
    q.fn((t) => avoidedPair(t, eps)[0], { color: q.c.blue, width: 2.5 });
    q.fn((t) => avoidedPair(t, eps)[1], { color: q.c.green, width: 2.5 });
    const [hi, lo] = avoidedPair(aa, eps);
    q.line(aa, -2.2, aa, 2.2, { color: q.c.accent, width: 1, alpha: 0.6 });
    q.dot(aa, hi, { r: 5, color: q.c.blue });
    q.dot(aa, lo, { r: 5, color: q.c.green });
    if (eps > 0) {
      q.line(0, -eps, 0, eps, { color: q.c.accent, width: 2 });
      q.text(`gap ${fmt(2 * eps)}`, 0.35, 0, { color: q.c.accent, size: 12 });
    }
  });
  const sA = slider({ label: "a", min: -2, max: 2, step: 0.01, value: aa, onInput: (v) => { aa = v; update(); } });
  const sE = slider({ label: "ε", min: 0, max: 1, step: 0.01, value: eps, onInput: (v) => { eps = v; update(); } });
  root.append(panel("Eigenvalues don't quite meet", g.el, legend([["--blue", "the larger eigenvalue"], ["--green", "the smaller one"]]), controls(sA.el, sE.el)));

  root.append(tryIt([
    "Set ε to 0. The two lines cross in an X.",
    "Raise ε a little. The X splits into two curves that never touch. The closest they get is 2ε, at a = 0.",
  ]));

  const m = mathPanel([
    { tex: "A x = \\lambda x", note: "x is an eigenvector when A only stretches it. λ is how much." },
    { id: "A", tex: "" },
    { tex: "\\det(A - \\lambda I) = 0 \\;\\Longrightarrow\\; \\lambda^2 - (a + d)\\,\\lambda + (ad - bc) = 0", note: "A x = λ x means (A − λI) x = 0 has a nonzero answer, which needs A − λI to be singular. For a 2×2 matrix that's a quadratic in λ." },
    { id: "lam", tex: "" },
    { tex: "A^k x = c_1 \\lambda_1^k v_1 + c_2 \\lambda_2^k v_2", note: "Write x in eigenvectors and applying A k times just raises each λ to the k. The bigger |λ| wins, which is why “Apply A again” swings x onto it." },
    { tex: "\\begin{bmatrix} a & \\varepsilon \\\\ \\varepsilon & -a \\end{bmatrix}:\\quad \\lambda = \\pm\\sqrt{a^2 + \\varepsilon^2}", note: "The closest the two get is ±ε at a = 0, a gap of 2ε. Only ε = 0 lets them touch." },
    { id: "avoid", tex: "" },
  ], [
    ["A", "the matrix, with entries a, b, c, d"],
    ["x", "the vector you drag"],
    ["\\lambda,\\ \\lambda_1,\\ \\lambda_2", "eigenvalues: how much each eigenvector is stretched"],
    ["v_1,\\ v_2", "the eigenvectors"],
    ["I", "the identity matrix: 1s on the diagonal, 0s elsewhere"],
    ["\\det", "the determinant; zero means the matrix flattens something"],
    ["c_1,\\ c_2", "the amounts of each eigenvector in x"],
    ["k", "how many times A is applied"],
    ["\\varepsilon", "the small off-diagonal entry that keeps the eigenvalues apart"],
  ]);
  root.append(m.el);
  root.append(upNext("complex numbers. A rotation has no real eigenvectors, but it has complex ones, and complex numbers are rotations."));

  function isLined(u, v) {
    const t = angle2(u, v);
    return Number.isFinite(t) && (t < 0.035 || t > Math.PI - 0.035);
  }
  function update() {
    const Ax = mulMV(A, x);
    m.set("A", `A = ${mat(A, 2)},\\quad A x = ${mat(A, 2)} ${vec(x, 2)} = ${vec(Ax, 2)}`);
    const tr = A[0][0] + A[1][1], d = det2(A), e = eig2(A);
    const quad = `\\lambda^2 - ${num(tr)}\\,\\lambda + ${num(d)} = 0`.replace("- -", "+ ").replace("+ -", "- ");
    m.set("lam", e.real
      ? `${quad}\\;\\Rightarrow\\; \\lambda_1 = ${num(e.values[0])},\\ \\lambda_2 = ${num(e.values[1])}`
      : `${quad}\\;\\Rightarrow\\; \\lambda = ${num(e.values[0][0])} \\pm ${num(e.values[0][1])}\\,i`);
    const [hi, lo] = avoidedPair(aa, eps);
    m.set("avoid", `a = ${num(aa)},\\ \\varepsilon = ${num(eps)}:\\quad \\lambda = ${num(hi)},\\ ${num(lo)}`);
    if (isLined(x, Ax) && len2(x) > 1e-9) {
      const lam = Math.sign(Ax[0] * x[0] + Ax[1] * x[1]) * len2(Ax) / len2(x);
      status.textContent = `Lined up: x is an eigenvector, and A stretches it by λ = ${fmt(lam)}.`;
    } else if (!e.real) {
      status.textContent = "This matrix turns every direction, so it has no real eigenvectors. Its eigenvalues are complex.";
    } else {
      status.textContent = `Not lined up: A turns x by ${fmt((angle2(x, Ax) * 180) / Math.PI, 1)}°. Eigenvalues: ${fmt(e.values[0])} and ${fmt(e.values[1])}.`;
    }
    p.request(); q.request();
  }
  update();

  return { destroy() { p.destroy(); q.destroy(); } };
}
