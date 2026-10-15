// Lesson 7: complex numbers are turns. Drag z and w; their product has the
// lengths multiplied and the angles added. Then e^{iωt} goes round the
// circle, and its real and imaginary parts trace cos and sin.

import { animate, figure } from "../plot.js";
import { button, check, controls, el, fmt, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { cabs, carg, cmul, TAU } from "../cmath.js";

const deg = (a) => (a * 180) / Math.PI;

/** x + iy as LaTeX, with "- i" rather than "+ -i". */
function rect(z, d = 2) {
  return `${num(z[0], d)} ${z[1] < 0 ? "-" : "+"} ${num(Math.abs(z[1]), d)}\\,i`;
}

export function mount(root) {
  const z = [1.5, 0.75], w = [0.5, 1.25];
  let showProduct = true;

  root.append(prose(`
    <p>A complex number is a pair of numbers, ${inl("z = x + iy")}, drawn as a point in a plane: ${inl("x")} across (the <b>real</b> part) and ${inl("y")} up (the <b>imaginary</b> part). The one new rule is ${inl("i^2 = -1")}.</p>
    <p>So far that's just a 2D vector. What makes it more is multiplication. Describe ${inl("z")} by its length ${inl("r")} and its angle ${inl("\\theta")} instead. Then multiplying two complex numbers <b>multiplies their lengths and adds their angles</b>. Multiplying by a number of length 1 is a pure turn. That's the whole reason waves and complex numbers fit together so well.</p>`));

  /* ---------- Figure 1: z, w and z w ---------- */
  const f1 = figure({ x: [-3, 3], y: [-3, 3], equal: true, aspect: 1.3, cap: "Drag z and w. The orange arrow is the product z w." });
  const p = f1.plot;
  p.draw((p) => {
    p.circle(0, 0, 1, { color: p.c.lineStrong, dash: [4, 4], width: 1 });
    p.text("1", 1, 0, { color: p.c.fgSubtle, dx: 4, dy: 10, size: 11 });
    p.text("i", 0, 1, { color: p.c.fgSubtle, dx: 6, dy: -8, size: 11 });
    const arc = (a, r, color) => {
      const pts = [];
      const n = 40;
      for (let k = 0; k <= n; k++) pts.push([r * Math.cos((a * k) / n), r * Math.sin((a * k) / n)]);
      p.path(pts, { color, width: 2, alpha: 0.8 });
    };
    const az = carg(z), aw = carg(w);
    arc(az, 0.45, p.c.blue);
    if (showProduct) {
      arc(aw, 0.6, p.c.green);
      // The product's angle: θz then θw stacked on top.
      const pts = [];
      for (let k = 0; k <= 40; k++) { const t = az + (aw * k) / 40; pts.push([0.75 * Math.cos(t), 0.75 * Math.sin(t)]); }
      p.path(pts, { color: p.c.accent, width: 2, alpha: 0.8 });
      const zw = cmul(z, w);
      p.arrow(0, 0, w[0], w[1], { color: p.c.green });
      p.arrow(0, 0, zw[0], zw[1], { color: p.c.accent, width: 3 });
      p.text("z w", zw[0], zw[1], { color: p.c.accent, dx: 10, dy: -10 });
      p.text("w", w[0], w[1], { color: p.c.green, dx: 10, dy: -10 });
    }
    p.arrow(0, 0, z[0], z[1], { color: p.c.blue });
    p.text("z", z[0], z[1], { color: p.c.blue, dx: 10, dy: -10 });
  });
  const snap = (v) => Math.round(v * 20) / 20;
  p.handle({ get: () => z, set: (x, y) => { z[0] = snap(x); z[1] = snap(y); update(); }, color: (c) => c.blue, r: 7 });
  p.handle({ get: () => w, set: (x, y) => { w[0] = snap(x); w[1] = snap(y); update(); }, color: (c) => c.green, r: 7, visible: () => showProduct });

  const prodCheck = check({ label: "Show w and the product z w", checked: true, onChange: (on) => { showProduct = on; update(); } });
  const unitBtn = el("div", { class: "btn-row" },
    button("Make w length 1", () => {
      const r = cabs(w) || 1;
      w[0] = snap(w[0] / r); w[1] = snap(w[1] / r);
      update();
    }),
    button("w = i", () => { w[0] = 0; w[1] = 1; update(); }));
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Multiplying is turning",
    f1.el,
    legend([["--blue", "z"], ["--green", "w"], ["--accent", "z w"]]),
    controls(prodCheck.el, unitBtn),
    status));

  root.append(tryIt([
    "Press “w = i”. Multiplying by i turns z a quarter turn counterclockwise, and leaves its length alone. Do it twice in your head: that's i² = −1, a half turn.",
    "Press “Make w length 1”, then drag w around the dashed circle. z w swings around at the same distance from the center as z.",
    "Drag w outside the circle. Now z w is stretched as well as turned.",
  ]));

  /* ---------- Figure 2: e^{iωt} and its shadows ---------- */
  root.append(prose(`
    <p>Now let the angle grow steadily with time: ${inl("\\theta = \\omega t")}. The point ${inl("e^{i\\omega t}")} runs around the unit circle at ${inl("\\omega")} radians per second. This spinning arrow is called a <b>phasor</b>.</p>
    <p>Watch its shadows. Its real part, the shadow on the horizontal axis, slides back and forth as ${inl("\\cos \\omega t")}. Its imaginary part, the shadow on the vertical axis, slides up and down as ${inl("\\sin \\omega t")}. A steady turn, seen from the side, is a wave. That's <b>Euler's formula</b>: ${inl("e^{i\\theta} = \\cos\\theta + i \\sin\\theta")}.</p>`));

  // A phone gets a shorter wave panel, so the figure can be taller.
  const narrow = window.matchMedia("(max-width: 640px)").matches;
  const SPAN = (narrow ? 1.3 : 2.2) * TAU; // how much of the past the waves show, in radians
  const X0 = 1.7, XW = narrow ? 3.4 : 6.3; // where the waves start, and how wide they are
  let theta = 0, omega = 1.5, playing = true;
  const hist = []; // [time-ordered angles]
  const f2 = figure({ x: [-1.35, X0 + XW + 0.2], y: [-1.35, 1.35], equal: true, aspect: narrow ? 1.9 : 3, axes: false, grid: false,
    cap: "The point e<sup>iωt</sup> goes round the circle. Its real part (blue) and imaginary part (green) trace waves to the right, newest on the left." });
  const q = f2.plot;
  q.draw((q) => {
    // Circle and axes.
    q.line(-1.3, 0, 1.3, 0, { color: q.c.lineStrong, width: 1 });
    q.line(0, -1.3, 0, 1.3, { color: q.c.lineStrong, width: 1 });
    q.circle(0, 0, 1, { color: q.c.lineStrong, width: 1.5 });
    // Wave panel: a baseline and the +1 / -1 guides.
    for (const y of [1, -1]) q.line(X0, y, X0 + XW, y, { color: q.c.grid, width: 1 });
    q.line(X0, 0, X0 + XW, 0, { color: q.c.lineStrong, width: 1 });
    const c = Math.cos(theta), s = Math.sin(theta);
    // Waves: newest value at X0, older to the right.
    const toX = (a) => X0 + ((theta - a) / SPAN) * XW;
    const cosPts = [], sinPts = [];
    for (const a of hist) {
      const x = toX(a);
      if (x > X0 + XW) continue;
      cosPts.push([x, Math.cos(a)]);
      sinPts.push([x, Math.sin(a)]);
    }
    q.path(cosPts, { color: q.c.blue, width: 2.2 });
    q.path(sinPts, { color: q.c.green, width: 2.2 });
    // Shadows on the axes, and the lines carrying them to the waves.
    q.line(c, s, c, 0, { color: q.c.blue, width: 1.2, dash: [3, 3] });
    q.line(c, s, 0, s, { color: q.c.green, width: 1.2, dash: [3, 3] });
    q.line(0, s, X0, s, { color: q.c.green, width: 1, dash: [2, 4], alpha: 0.6 });
    q.dot(c, 0, { r: 5, color: q.c.blue });
    q.dot(0, s, { r: 5, color: q.c.green });
    q.dot(X0, c, { r: 4, color: q.c.blue });
    q.dot(X0, s, { r: 4, color: q.c.green });
    q.arrow(0, 0, c, s, { color: q.c.accent, width: 3 });
    q.text("cos ωt", X0 + XW, 1.2, { color: q.c.blue, align: "right", size: 12 });
    q.text("sin ωt", X0 + XW - (narrow ? 1.1 : 1.3), 1.2, { color: q.c.green, align: "right", size: 12 });
  });

  const anim = animate(f2.el, (dt) => {
    theta += omega * dt;
    hist.push(theta);
    while (hist.length && theta - hist[0] > SPAN + 0.5) hist.shift();
    q.request();
    if (m) m.set("euler", `e^{i\\,${num(theta % TAU, 2)}} = ${num(Math.cos(theta), 2)} ${Math.sin(theta) < 0 ? "-" : "+"} ${num(Math.abs(Math.sin(theta)), 2)}\\,i`);
  }, () => playing);
  const playBtn = button("Pause", () => {
    playing = !playing;
    playBtn.textContent = playing ? "Pause" : "Play";
    if (playing) anim.kick();
  }, "solid");
  const sw = slider({ label: "ω, turning speed", min: 0.3, max: 4, step: 0.1, value: omega, format: (v) => `${fmt(v, 1)} rad/s`, onInput: (v) => (omega = v) });
  root.append(panel("A turn, seen from the side, is a wave", f2.el,
    legend([["--accent", "e<sup>iωt</sup>"], ["--blue", "real part, cos ωt"], ["--green", "imaginary part, sin ωt"]]),
    controls(el("div", { class: "btn-row" }, playBtn), sw.el)));

  root.append(tryIt([
    "Watch the green shadow climb the vertical axis and the green wave climb with it. The blue wave is the same shape, a quarter turn earlier: cos is sin shifted.",
    "Speed ω up. The waves bunch together: higher frequency means more turns per second.",
  ]));

  /* ---------- The math ---------- */
  const m = mathPanel([
    { tex: "z = x + iy = r\\,e^{i\\theta}, \\qquad r = \\sqrt{x^2 + y^2}, \\quad \\theta = \\operatorname{atan2}(y, x)",
      note: "The same number two ways: across and up, or length and angle." },
    { id: "z", tex: "" },
    { tex: "z\\,w = r_z e^{i\\theta_z} \\cdot r_w e^{i\\theta_w} = (r_z r_w)\\, e^{i(\\theta_z + \\theta_w)}",
      note: "Lengths multiply, angles add. In x and y it's (x₁x₂ − y₁y₂) + i(x₁y₂ + y₁x₂), which says the same thing less clearly." },
    { id: "zw", tex: "" },
    { tex: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta",
      note: "Euler's formula: the point at angle θ on the unit circle." },
    { id: "euler", tex: "" },
    { tex: "\\cos\\theta = \\frac{e^{i\\theta} + e^{-i\\theta}}{2}, \\qquad \\sin\\theta = \\frac{e^{i\\theta} - e^{-i\\theta}}{2i}",
      note: "Turn it around: a cosine is two phasors spinning opposite ways, whose imaginary parts cancel. This is why Fourier transforms have negative frequencies." },
  ], [
    ["z,\\ w", "complex numbers: points in the plane"],
    ["x,\\ y", "the real part (across) and the imaginary part (up)"],
    ["i", "the number with i² = −1: a quarter turn"],
    ["r", "the length of z, also written |z|"],
    ["\\theta", "the angle of z, counterclockwise from the positive real axis"],
    ["\\operatorname{atan2}(y, x)", "the angle of the point (x, y), in the right quadrant"],
    ["e^{i\\theta}", "the point at angle θ on the unit circle"],
    ["\\omega", "angular frequency: how fast the angle grows, in radians per second"],
    ["t", "time, in seconds"],
  ]);
  root.append(m.el);
  root.append(upNext("roots of unity: the N evenly spaced points on the circle. They're the building blocks of the discrete Fourier transform."));

  function update() {
    const r = cabs(z), a = carg(z);
    m.set("z", `z = ${rect(z)} = ${num(r)}\\, e^{i\\,${num(a)}} \\quad (${num(deg(a), 0)}^\\circ)`);
    const zw = cmul(z, w);
    m.set("zw", `${num(cabs(z))} \\times ${num(cabs(w))} = ${num(cabs(zw))}, \\qquad ${num(deg(carg(z)), 0)}^\\circ + ${num(deg(carg(w)), 0)}^\\circ \\to ${num(deg(carg(zw)), 0)}^\\circ`);
    const rw = cabs(w);
    status.textContent = !showProduct ? ""
      : Math.abs(rw - 1) < 0.03 ? "w has length 1, so multiplying by it only turns z."
      : rw > 1 ? `w has length ${fmt(rw, 2)}, so z w is ${fmt(rw, 2)} times longer than z, and turned.`
      : `w has length ${fmt(rw, 2)}, so z w is shorter than z, and turned.`;
    p.request();
  }
  update();

  return { destroy() { anim.stop(); p.destroy(); q.destroy(); } };
}
