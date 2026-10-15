// Lesson 16: Fourier series. Build a square, sawtooth or triangle wave from
// sines, switch harmonics off one by one, watch the Gibbs overshoot refuse to
// shrink, see the same sum as spinning circles, then draw any closed shape and
// have circles trace it.

import { animate, figure } from "../plot.js";
import { button, check, controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { TAU } from "../cmath.js";
import { listenButton, stopAll } from "../audio.js";
import { render } from "../sound-math.js";
import { WAVES, curveCoeffs, epicyclePoint, partialSum, peak, resampleClosed, sineCoeffs } from "./fourier-math.js";

export function mount(root) {
  const narrow = window.matchMedia("(max-width: 640px)").matches; // phones get taller figures
  let wave = "square";
  let K = 7;
  const off = new Set(); // harmonics switched off
  let b = sineCoeffs(wave, 60);
  const on = (k) => k <= K && !off.has(k);

  root.append(prose(`
    <p>A periodic signal repeats every ${inl("T")} seconds. Fourier's claim is that any reasonable one is a sum of sines and cosines whose frequencies are whole multiples of the base frequency ${inl("1/T")}: the <b>harmonics</b>. The amounts of each are the <b>Fourier series coefficients</b>.</p>
    <p>Finding them is the same job as in the orthogonal bases lesson. The harmonics are orthogonal to each other, so the amount of each one is just a dot product of the signal with that harmonic, done with an integral instead of a sum.</p>`));

  /* ---------- Build a wave ---------- */
  const f1 = figure({ x: [0, 2], y: [-1.6, 1.6], aspect: narrow ? 1.5 : 2.3, xTicks: 0.25, cap: "Two periods. Dashed: the wave you're aiming for. Solid: the sum of the harmonics that are on." });
  const p1 = f1.plot;
  let showParts = false;
  p1.draw((p) => {
    p.fn((t) => WAVES[wave].f(t), { color: p.c.fgSubtle, width: 1.5, dash: [6, 5] });
    if (showParts) {
      const cols = [p.c.green, p.c.purple, p.c.gold];
      let i = 0;
      for (let k = 1; k <= K; k++) if (on(k) && b[k]) p.fn((t) => b[k] * Math.sin(TAU * k * t), { color: cols[i++ % 3], width: 1.2, alpha: 0.6 });
    }
    p.fn((t) => partialSum(b, t, on), { color: p.c.blue, width: 2.5 });
    if (gibbs && wave !== "triangle") {
      p.line(0, gibbs.peak, 2, gibbs.peak, { color: p.c.accent, width: 1.2, dash: [3, 4] });
      p.text(narrow ? `+${fmt(gibbs.pct, 1)}%` : `peak ${fmt(gibbs.peak, 3)}: ${fmt(gibbs.pct, 1)}% of the jump past the top`, 1.98, gibbs.peak, { color: p.c.accent, align: "right", dy: -12, size: 12 });
    }
  });

  const f2 = figure({ x: [0.3, 12.7], y: [-1.4, 1.4], aspect: narrow ? 2 : 3.2, xTicks: 1, vAxis: false, cap: "The coefficient b<sub>k</sub> of each harmonic. Tap a stem to switch that harmonic off or back on." });
  const p2 = f2.plot;
  p2.draw((p) => {
    const ks = [], vs = [], koff = [], voff = [];
    for (let k = 1; k <= K; k++) (off.has(k) ? (koff.push(k), voff.push(b[k])) : (ks.push(k), vs.push(b[k])));
    p.stems(koff, voff, { color: p.c.fgSubtle, alpha: 0.35 });
    p.stems(ks, vs, { color: p.c.blue });
  });
  p2.onDrag = (wx, wy, first) => {
    if (!first) return;
    const k = Math.round(wx);
    if (k < 1 || k > K) return;
    if (off.has(k)) off.delete(k); else off.add(k);
    update();
  };

  const preset = segmented({ label: "Wave", options: [["square", "Square"], ["sawtooth", "Sawtooth"], ["triangle", "Triangle"]], value: wave,
    onChange: (v) => { wave = v; b = sineCoeffs(v, 60); off.clear(); update(); } });
  const sK = slider({ label: "Harmonics used, K", min: 1, max: 60, step: 1, value: K, format: (v) => String(v), onInput: (v) => { K = v; update(); } });
  const parts = check({ label: "Show each harmonic", onChange: (v) => { showParts = v; p1.request(); } });
  const allOn = button("Turn all back on", () => { off.clear(); update(); });
  const gibbsNote = el("p", { class: "small", style: "margin:10px 0 0" });
  // The sum on screen, played as a 220 Hz note. Harmonics stay under 13.2 kHz,
  // well inside what 44.1 kHz can carry.
  const RATE = 44100, BASE = 220;
  // One period worked out once, then read around at 220 turns a second.
  const tone = () => {
    const P = 4096, table = Float64Array.from({ length: P }, (_, i) => partialSum(b, i / P, on));
    return render((t) => {
      const u = (BASE * t * P) % P, i = Math.floor(u), f = u - i;
      return table[i] * (1 - f) + table[(i + 1) % P] * f;
    }, 1.5, RATE);
  };
  const hear = listenButton("Listen", () => ({ samples: tone(), rate: RATE }), "solid");
  const hearOne = listenButton("Just the first harmonic", () => ({ samples: render((t) => Math.sin(TAU * BASE * t), 1.5, RATE), rate: RATE }));

  root.append(panel("Build a wave from harmonics", f1.el,
    legend([["--fg-subtle", "target"], ["--blue", "sum of harmonics"], ["--accent", "highest point"]]),
    f2.el,
    controls(el("div", { class: "ctl" }, el("span", { class: "lbl", text: "Wave" }), preset.el), sK.el, parts.el, el("div", {}, allOn)),
    gibbsNote,
    el("div", { class: "btn-row", style: "margin-top:12px" }, hear.el, hearOne.el),
    el("p", { class: "small subtle", style: "margin:6px 0 0", text: "Plays the sum above as a 220 Hz note. More harmonics sound brighter and buzzier; the pitch stays the same." })));

  root.append(tryIt([
    "Square wave, K = 1: one sine already has the right swing. Raise K and the corners sharpen.",
    "Watch the orange line as K goes from 7 to 60. The wiggles squeeze toward the jump, but the peak stays about 9% too high. That's the <strong>Gibbs phenomenon</strong>.",
    "Pick the triangle. It has no jumps, its coefficients shrink like 1/k², and three harmonics already look almost perfect.",
    "Tap the stem at k = 1 to switch it off. What's left is a jumpy wave at three times the frequency, mostly.",
    "Press Listen at K = 1, then at K = 60. Same note, but the square wave gets buzzy as the high harmonics come in. The triangle stays soft: its high harmonics are tiny.",
  ]));

  /* ---------- Epicycles ---------- */
  root.append(prose(`
    <p>Each harmonic is a point going round a circle: ${inl("b_k \\sin(2\\pi k t)")} is the height of a point on a circle of radius ${inl("|b_k|")} that turns ${inl("k")} times per period. Stack the circles, each one riding on the rim of the one before, and the height of the last point is the whole sum. Those stacked circles are called <b>epicycles</b>.</p>`));
  const f3 = figure({ x: [-2.2, 4.6], y: [-1.7, 1.7], equal: true, aspect: narrow ? 1.3 : 2.1, grid: false, axes: false, cap: "Circles for the harmonics that are on in the wave above. The height of the last point traces the wave to the right." });
  const p3 = f3.plot;
  let phase = 0, playing = true;
  const CX = -0.6, WAVE_X = 1.6, WAVE_W = 2.9;
  p3.draw((p) => {
    let x = CX, y = 0;
    const ks = [];
    for (let k = 1; k <= K; k++) if (on(k) && b[k]) ks.push(k);
    for (const k of ks) {
      const r = Math.abs(b[k]);
      p.circle(x, y, r, { color: p.c.lineStrong, width: 1 });
      const nx = x + b[k] * Math.cos(TAU * k * phase), ny = y + b[k] * Math.sin(TAU * k * phase);
      p.line(x, y, nx, ny, { color: p.c.fgMuted, width: 1.5 });
      x = nx; y = ny;
    }
    // The wave: the sum over the last period, newest value at the left.
    p.line(WAVE_X, 0, WAVE_X + WAVE_W, 0, { color: p.c.line, width: 1 });
    p.fn((u) => partialSum(b, phase - (u - WAVE_X) / WAVE_W, on), { from: WAVE_X, to: WAVE_X + WAVE_W, color: p.c.blue, width: 2.5 });
    p.line(x, y, WAVE_X, y, { color: p.c.accent, width: 1, dash: [4, 4] });
    p.dot(x, y, { r: 5, color: p.c.accent });
    p.dot(WAVE_X, y, { r: 4, color: p.c.blue });
  });
  const anim = animate(f3.el, (dt) => { phase = (phase + dt * 0.2) % 1; p3.request(); }, () => playing);
  const playBtn = button("Pause", () => { playing = !playing; playBtn.textContent = playing ? "Pause" : "Play"; anim.kick(); });
  root.append(panel("Circles that draw the wave", f3.el, controls(el("div", {}, playBtn), el("p", { class: "small subtle", style: "margin:0", text: "It uses the same wave, K and switched-off harmonics as above." }))));

  /* ---------- Draw your own ---------- */
  root.append(prose(`
    <p>Now let the point move in 2D. Treat a closed drawing as a complex signal ${inl("z(t) = x(t) + i\\,y(t)")} going once around as ${inl("t")} goes from 0 to 1. Its Fourier series ${inl("z(t) = \\sum_k c_k e^{2\\pi i k t}")} is a set of circles, one per ${inl("k")}, turning ${inl("k")} times per lap. Negative ${inl("k")} turns the other way. With enough circles, the tip follows any shape you draw.</p>`));
  const f4 = figure({ x: [-1.6, 1.6], y: [-1.25, 1.25], equal: true, aspect: narrow ? 1.05 : 1.35, grid: false, axes: false, cap: "Draw one closed loop with your mouse or finger. Lift to let the circles trace it." });
  const p4 = f4.plot;
  const M = 256;
  let stroke = null;        // points while drawing
  let shape = heart();      // the resampled shape
  let coeffs = curveCoeffs(shape, 100);
  let count = 15;
  let trace = [];
  let t4 = 0, playing4 = true;
  function retrace() {
    trace = Array.from({ length: 401 }, (_, i) => epicyclePoint(coeffs, i / 400, count));
  }
  retrace();
  p4.draw((p) => {
    if (stroke) {
      p.path(stroke, { color: p.c.accent, width: 2.5 });
      return;
    }
    if (!shape.length) {
      p.text("Draw a closed shape here", 0, 0, { align: "center", color: p.c.fgSubtle, size: 15 });
      return;
    }
    p.path(shape, { color: p.c.fgSubtle, width: 1.5, close: true, dash: [4, 4] });
    // The trace so far this lap, then the circles.
    const upto = Math.floor(t4 * 400);
    p.path(trace.slice(0, upto + 1), { color: p.c.blue, width: 2.5 });
    let x = 0, y = 0;
    for (let j = 0; j < Math.min(count, coeffs.length); j++) {
      const { k, re, im, r } = coeffs[j];
      const a = TAU * k * t4, c = Math.cos(a), s = Math.sin(a);
      const nx = x + re * c - im * s, ny = y + re * s + im * c;
      if (j > 0 && r > 0.004) {
        p.circle(x, y, r, { color: p.c.lineStrong, width: 0.8 });
        p.line(x, y, nx, ny, { color: p.c.fgMuted, width: 1.2 });
      }
      x = nx; y = ny;
    }
    p.dot(x, y, { r: 4.5, color: p.c.accent });
  });
  p4.onDrag = (wx, wy, first) => {
    if (first) stroke = [];
    stroke.push([wx, wy]);
  };
  p4.onDragEnd = () => {
    const s = stroke;
    stroke = null;
    if (s && s.length > 8) {
      shape = resampleClosed(s, M);
      coeffs = curveCoeffs(shape, 100);
      retrace();
      t4 = 0;
      update4();
    }
    p4.request();
  };
  const anim4 = animate(f4.el, (dt) => { if (shape.length) t4 = (t4 + dt * 0.12) % 1; p4.request(); }, () => playing4);
  const sCount = slider({ label: "Circles used", min: 1, max: 201, step: 1, value: count, format: (v) => String(v), onInput: (v) => { count = v; retrace(); update4(); } });
  const play4 = button("Pause", () => { playing4 = !playing4; play4.textContent = playing4 ? "Pause" : "Play"; anim4.kick(); });
  const clear4 = button("Clear", () => { shape = []; coeffs = []; trace = []; p4.request(); update4(); });
  const heartBtn = button("Heart", () => { shape = heart(); coeffs = curveCoeffs(shape, 100); retrace(); t4 = 0; update4(); });
  const note4 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Draw your own shape", f4.el, controls(sCount.el, el("div", { class: "btn-row" }, play4, clear4, heartBtn)), note4));

  root.append(tryIt([
    "Slide “Circles used” down to 1. One circle (plus the center) is the best-fitting circle for your shape.",
    "Draw something with a sharp corner. The corner needs many more circles than the smooth parts, the same reason the square wave needs so many sines.",
    "Draw a shape the long way round, then the other way. The biggest circle flips between k = 1 and k = −1.",
  ]));

  /* ---------- The math ---------- */
  const m = mathPanel([
    { tex: "x(t) = a_0 + \\sum_{k=1}^{\\infty} \\big( a_k \\cos(k\\omega_0 t) + b_k \\sin(k\\omega_0 t) \\big), \\qquad \\omega_0 = \\frac{2\\pi}{T}",
      note: "A periodic signal as a sum of harmonics. The waves above are odd (flip sign when you flip time), so every cosine amount is zero and only sines are left." },
    { tex: "b_k = \\frac{2}{T} \\int_0^T x(t) \\sin(k\\omega_0 t)\\, dt",
      note: "The amount of one harmonic: a dot product of the signal with that sine, divided by the sine's own length squared. Same recipe as an orthogonal basis, with an integral for the sum." },
    { id: "coef", tex: "" },
    { id: "gibbs", tex: "" },
    { tex: "x(t) = \\sum_{k=-\\infty}^{\\infty} c_k\\, e^{i k \\omega_0 t}, \\qquad c_k = \\frac{1}{T} \\int_0^T x(t)\\, e^{-i k \\omega_0 t}\\, dt",
      note: "The same series with complex exponentials. Each cosine and sine pair becomes two terms, at k and −k. This is the form the drawing uses, and the form the rest of the course uses." },
    { id: "draw", tex: "" },
  ], [
    ["x(t)", "the periodic signal, at time t"],
    ["T", "the period: how long until the signal repeats (1 in the figures)"],
    ["\\omega_0", "the base angular frequency, 2π/T radians per second"],
    ["k", "which harmonic: k times the base frequency"],
    ["a_k,\\ b_k", "the amounts of the cosine and the sine at harmonic k"],
    ["a_0", "the average value (zero for these waves)"],
    ["K", "how many harmonics the figure adds up"],
    ["c_k", "the complex amount of harmonic k: its size is the circle's radius, its angle is where the circle starts"],
    ["e^{i\\theta}", "the point at angle θ on the unit circle, cos θ + i sin θ"],
    ["z(t)", "the drawing as a complex signal, x + iy"],
    ["\\textstyle\\int_0^T", "add up over one period"],
  ]);
  root.append(m.el);
  root.append(upNext("from series to transform: let the period grow without limit, and the harmonics crowd together into a continuous spectrum."));

  let gibbs = null;
  function update() {
    sK.set(K);
    p2.setRange([0.3, Math.max(12, K) + 0.7]);
    const pk = peak(b, on, 2400);
    gibbs = { peak: pk, pct: ((pk - 1) / 2) * 100 };
    gibbsNote.innerHTML = wave === "triangle"
      ? "The triangle has no jumps, so there's no overshoot to speak of. Its coefficients shrink like 1/k², so it converges fast."
      : `Highest point: ${fmt(pk, 3)}. That's ${fmt(gibbs.pct, 1)}% of the jump (2) past the top. It heads toward about 8.9% and stays there, however large K gets.`;
    const shown = [];
    for (let k = 1; k <= Math.min(K, 9); k++) if (b[k]) shown.push(`b_{${k}} = ${num(b[k], 3)}`);
    const rule = { square: "b_k = \\tfrac{4}{\\pi k}\\ \\text{(odd } k)", sawtooth: "b_k = \\tfrac{2(-1)^{k+1}}{\\pi k}", triangle: "b_k = \\pm\\tfrac{8}{\\pi^2 k^2}\\ \\text{(odd } k)" }[wave];
    m.set("coef", `${rule}:\\quad ${shown.slice(0, 4).join(",\\ ")}${shown.length > 4 ? ",\\ \\dots" : ""}`);
    m.set("gibbs", wave === "triangle"
      ? `K = ${K},\\quad \\max_t x_K(t) = ${num(pk, 3)}`
      : `K = ${K},\\quad \\max_t x_K(t) = ${num(pk, 3)},\\quad \\frac{${num(pk, 3)} - 1}{2} = ${num(gibbs.pct, 1)}\\%`);
    p1.request(); p2.request(); p3.request();
  }
  function update4() {
    const used = Math.min(count, coeffs.length);
    note4.textContent = shape.length
      ? `${used} circle${used === 1 ? "" : "s"} (the first is the shape's center, k = 0). Biggest circles first.`
      : "Draw a closed shape to see its circles.";
    const top = coeffs.slice(1, 4).map((c) => `|c_{${c.k}}| = ${num(c.r, 3)}`);
    m.set("draw", shape.length ? `z(t) \\approx \\sum_{\\text{${used} terms}} c_k e^{2\\pi i k t},\\quad ${top.join(",\\ ")}` : "z(t) = \\text{(draw a shape)}");
    p4.request();
  }
  update();
  update4();

  return { destroy() { stopAll(); anim.stop(); anim4.stop(); for (const p of [p1, p2, p3, p4]) p.destroy(); } };
}

/** The default drawing: a heart, sampled evenly along its length. */
function heart() {
  const raw = Array.from({ length: 400 }, (_, i) => {
    const t = (TAU * i) / 400;
    return [0.06 * 16 * Math.sin(t) ** 3, 0.06 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + 0.1];
  });
  return resampleClosed(raw, 256);
}
