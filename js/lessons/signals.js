// Lesson 10: signals are vectors (Oppenheim, chapter 1). Edit a discrete
// signal, then shift, flip, scale, downsample or upsample it. Split it into
// even and odd parts. Then a continuous signal and the x(at + b) trap.

import { figure } from "../plot.js";
import { check, controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import {
  amplify, downsample, energy, evenPart, flip, fromArray, oddPart, pulse, shift, timeTransform, upsample, wrongOrder,
} from "./signals-math.js";

const START = -8, LEN = 17, VIEW = 12;
const ns = Array.from({ length: 2 * VIEW + 1 }, (_, i) => i - VIEW);
const PRESETS = {
  ramp: () => Array.from({ length: LEN }, (_, i) => (i >= 8 && i <= 13 ? (i - 7) / 3 : 0)),
  decay: () => Array.from({ length: LEN }, (_, i) => (i >= 8 ? 1.8 * 0.7 ** (i - 8) : 0)),
  bumpy: () => [0, 0, 0, 0, 0, 0.5, -0.5, 1, 1.5, 0.75, -1, 0.25, 1, 0, 0, 0, 0],
};

export function mount(root) {
  let values = PRESETS.ramp();
  let x = fromArray(values, START);
  let op = "shift", n0 = 3, A = -1.5, M = 2, L = 2;

  root.append(prose(`
    <p>A <b>discrete-time signal</b> ${inl("x[n]")} is a list of numbers indexed by a whole number ${inl("n")}, usually time steps. Square brackets mean "only whole numbers go in". It's a vector, just a long one, and often one that keeps going in both directions.</p>
    <p>Most of what you do to a signal moves its entries around. ${inl("x[n - n_0]")} delays it by ${inl("n_0")} steps. ${inl("x[-n]")} plays it backward. ${inl("x[2n]")} keeps every other sample. Each of these is a matrix acting on the vector, a fact lessons 12 and 13 put to work.</p>`));

  /* ---------- Figure 1: operations ---------- */
  const f1 = figure({ x: [-VIEW - 0.6, VIEW + 0.6], y: [-2.6, 2.6], aspect: 2.4, xTicks: 2, vAxis: false,
    cap: "Drag up or down on the plot to edit x[n] (gray). The result y[n] is in orange." });
  const p = f1.plot;
  p.draw((p) => {
    const y = result();
    p.stems(ns, ns.map(x), { color: p.c.fgSubtle, r: 3.5, alpha: 0.55 });
    p.stems(ns.map((n) => n + 0.18), ns.map(y), { color: p.c.accent, r: 4, width: 2 });
    p.line(0, -2.5, 0, 2.5, { color: p.c.lineStrong, width: 1, dash: [3, 4] });
  });
  p.onDrag = (wx, wy) => {
    const n = Math.round(wx);
    if (n < START || n >= START + LEN) return;
    values[n - START] = Math.max(-2.4, Math.min(2.4, Math.round(wy * 4) / 4));
    x = fromArray(values, START);
    update();
  };

  function result() {
    switch (op) {
      case "shift": return shift(x, n0);
      case "flip": return flip(x);
      case "amp": return amplify(x, A);
      case "down": return downsample(x, M);
      case "up": return upsample(x, L);
      default: return x;
    }
  }

  const opSeg = segmented({ label: "Operation", value: op, options: [
    ["shift", "Shift"], ["flip", "Flip"], ["amp", "Scale"], ["down", "Downsample"], ["up", "Upsample"],
  ], onChange: (v) => { op = v; update(); } });
  const sShift = slider({ label: "n₀, the delay", min: -6, max: 6, step: 1, value: n0, format: String, onInput: (v) => { n0 = v; update(); } });
  const sA = slider({ label: "A, the gain", min: -2, max: 2, step: 0.25, value: A, onInput: (v) => { A = v; update(); } });
  const sM = slider({ label: "M, keep every Mth sample", min: 2, max: 4, step: 1, value: M, format: String, onInput: (v) => { M = v; update(); } });
  const sL = slider({ label: "L, put L − 1 zeros between samples", min: 2, max: 4, step: 1, value: L, format: String, onInput: (v) => { L = v; update(); } });
  const presets = el("div", { class: "btn-row" },
    ...Object.entries({ ramp: "Ramp", decay: "Decay", bumpy: "Bumpy" }).map(([k, t]) =>
      el("button", { type: "button", class: "btn", text: t, onclick: () => { values = PRESETS[k](); x = fromArray(values, START); update(); } })));
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Move the samples around",
    f1.el,
    legend([["--fg-subtle", "x[n], the original"], ["--accent", "y[n], the result"]]),
    el("div", { class: "btn-row", style: "margin-top:12px" }, opSeg.el),
    controls(sShift.el, sA.el, sM.el, sL.el, presets), status));

  root.append(tryIt([
    "Shift with n₀ = 3. The signal moves 3 steps to the right: it happens later. A minus sign inside the brackets means a delay, which trips everyone up at first.",
    "Downsample by 2. Every other sample is thrown away, and the signal gets half as long. You can't get those samples back.",
    "Upsample by 2. Zeros go in between the samples. Nothing is lost: downsampling by 2 afterward gives back the original.",
  ]));

  /* ---------- Figure 2: even and odd parts ---------- */
  root.append(prose(`
    <p>Every signal splits into an <b>even</b> part, which is the same when flipped (${inl("x_e[-n] = x_e[n]")}), plus an <b>odd</b> part, which flips sign when flipped (${inl("x_o[-n] = -x_o[n]")}). Average the signal with its flip to get the even part; take half the difference for the odd part.</p>
    <p>The even and odd parts are perpendicular to each other. So the <b>energy</b>, the sum of squares (the squared length of the vector), splits cleanly too: ${inl("E_x = E_e + E_o")}. That's Pythagoras, in 25 dimensions.</p>`));
  const fe = figure({ x: [-VIEW - 0.6, VIEW + 0.6], y: [-2.2, 2.2], aspect: 1.9, xTicks: 4, vAxis: false, cap: "The even part x_e[n]: a mirror image about n = 0." });
  const fo = figure({ x: [-VIEW - 0.6, VIEW + 0.6], y: [-2.2, 2.2], aspect: 1.9, xTicks: 4, vAxis: false, cap: "The odd part x_o[n]: a mirror image, flipped upside down." });
  fe.plot.draw((q) => {
    q.line(0, -2.1, 0, 2.1, { color: q.c.lineStrong, width: 1, dash: [3, 4] });
    q.stems(ns, ns.map(evenPart(x)), { color: q.c.green, r: 3 });
  });
  fo.plot.draw((q) => {
    q.line(0, -2.1, 0, 2.1, { color: q.c.lineStrong, width: 1, dash: [3, 4] });
    q.stems(ns, ns.map(oddPart(x)), { color: q.c.purple, r: 3 });
  });
  root.append(panel("Even plus odd", el("div", { class: "fig-row" }, fe.el, fo.el),
    el("p", { class: "small subtle", style: "margin:10px 0 0", text: "These follow whatever you draw in the first plot." })));

  /* ---------- Figure 3: continuous time, x(at + b) ---------- */
  root.append(prose(`
    <p>A <b>continuous-time signal</b> ${inl("x(t)")} takes any real ${inl("t")}, written with round brackets. The same moves apply, plus stretching and squeezing time: ${inl("x(2t)")} plays twice as fast, ${inl("x(t/2)")} half as fast.</p>
    <p>The classic trap is ${inl("x(at + b)")}. The safe way to build it: first shift, ${inl("x(t + b)")}, then replace ${inl("t")} by ${inl("at")}. Scaling first and shifting second gives ${inl("x(a(t + b))")}, a different signal.</p>`));
  let a = 2, b = 1, showWrong = true;
  const fc = figure({ x: [-4, 4], y: [-0.25, 1.25], aspect: 2.6, xTicks: 1,
    cap: "Gray is x(t): a ramp, then a shelf. Orange is x(at + b). Dashed purple is the mistake, x(a(t + b))." });
  const g = fc.plot;
  g.draw((g) => {
    g.fn(pulse, { color: g.c.fgSubtle, width: 2, alpha: 0.7 });
    if (showWrong) g.fn(wrongOrder(pulse, a, b), { color: g.c.purple, width: 2, dash: [6, 5] });
    g.fn(timeTransform(pulse, a, b), { color: g.c.accent, width: 3 });
    // Where the ramp starts: a t + b = 0.
    const t0 = -b / a;
    g.dot(t0, 0, { r: 5, color: g.c.accent });
  });
  const aSeg = segmented({ label: "a", value: a, options: [[-2, "a = −2"], [-1, "−1"], [0.5, "½"], [1, "1"], [2, "2"]], onChange: (v) => { a = v; update(); } });
  const sb = slider({ label: "b", min: -3, max: 3, step: 0.5, value: b, format: (v) => fmt(v, 1), onInput: (v) => { b = v; update(); } });
  const wrong = check({ label: "Show the common mistake", checked: true, onChange: (on) => { showWrong = on; update(); } });
  const status3 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Shift, then scale",
    fc.el,
    legend([["--fg-subtle", "x(t)"], ["--accent", "x(at + b)"], ["--purple", "x(a(t + b)), the mistake"]]),
    el("div", { class: "btn-row", style: "margin-top:12px" }, aSeg.el),
    controls(sb.el, wrong.el), status3));

  root.append(tryIt([
    "With a = 2 and b = 1, the orange ramp starts at t = −½, but the purple one starts at t = −1. Only orange is x(2t + 1).",
    "Set a = −1. The signal flips around and runs backward in time.",
    "Set b = 0. Now both orders agree: with no shift, there's nothing to get in the wrong order.",
  ]));

  /* ---------- The math ---------- */
  const m = mathPanel([
    { tex: "y[n] = x[n - n_0], \\quad y[n] = x[-n], \\quad y[n] = A\\,x[n], \\quad y[n] = x[Mn], \\quad y[n] = \\begin{cases} x[n/L] & L \\text{ divides } n \\\\ 0 & \\text{otherwise} \\end{cases}",
      note: "Shift, flip, scale, downsample, upsample." },
    { id: "op", tex: "" },
    { tex: "x_e[n] = \\frac{x[n] + x[-n]}{2}, \\qquad x_o[n] = \\frac{x[n] - x[-n]}{2}, \\qquad x = x_e + x_o" },
    { tex: "E_x = \\sum_n |x[n]|^2 = E_e + E_o",
      note: "Energy is the squared length of the signal as a vector. Even and odd parts are perpendicular, so their energies add." },
    { id: "energy", tex: "" },
    { tex: "P = \\frac{1}{N} \\sum_{n=0}^{N-1} |x[n]|^2",
      note: "A signal that repeats forever has infinite energy, so we measure its power instead: the energy of one period, divided by its length N." },
    { id: "power", tex: "" },
    { tex: "y(t) = x(at + b): \\quad \\text{the feature at } t_x \\text{ in } x \\text{ moves to } t = \\frac{t_x - b}{a}" },
    { id: "ct", tex: "" },
  ], [
    ["x[n]", "a discrete-time signal: the value at whole-number step n"],
    ["x(t)", "a continuous-time signal: the value at any real time t"],
    ["y", "the signal that comes out"],
    ["n_0", "the delay, in steps (negative means earlier)"],
    ["A", "a gain: multiplies every value"],
    ["M,\\ L", "the downsampling and upsampling factors"],
    ["x_e,\\ x_o", "the even and odd parts of x"],
    ["E_x", "the energy of x: the sum of its squared values"],
    ["P", "the power of a repeating signal: energy per step over one period"],
    ["N", "the length of one period"],
    ["a,\\ b", "the time scale and the time shift in x(at + b)"],
    ["t_x", "a time where something happens in x, like the start of the ramp"],
  ]);
  root.append(m.el);
  root.append(upNext("the basic signals every system is tested with: impulses, steps and exponentials."));

  function update() {
    for (const [s, key] of [[sShift, "shift"], [sA, "amp"], [sM, "down"], [sL, "up"]]) s.el.hidden = op !== key;
    const OPS = {
      shift: `y[n] = x[n ${n0 >= 0 ? "-" : "+"} ${Math.abs(n0)}]`,
      flip: "y[n] = x[-n]",
      amp: `y[n] = ${num(A)}\\,x[n]`,
      down: `y[n] = x[${M}n]`,
      up: `y[n] = x[n/${L}] \\text{ when ${L} divides } n`,
    };
    m.set("op", OPS[op]);
    const Ex = energy(x, -VIEW, VIEW), Ee = energy(evenPart(x), -VIEW, VIEW), Eo = energy(oddPart(x), -VIEW, VIEW);
    m.set("energy", `E_x = ${num(Ex)} = ${num(Ee)} + ${num(Eo)}`);
    m.set("power", `\\text{repeat this x every } N = ${LEN} \\text{ steps:} \\quad P = ${num(Ex)} / ${LEN} = ${num(Ex / LEN, 3)}`);
    const t0 = -b / a, t1 = (1 - b) / a;
    m.set("ct", `a = ${num(a, 1)},\\ b = ${num(b, 1)}: \\quad \\text{ramp start } 0 \\to ${num(t0)}, \\quad \\text{ramp top } 1 \\to ${num(t1)}`);
    const msgs = {
      shift: n0 > 0 ? `Delayed by ${n0}: everything happens ${n0} steps later.` : n0 < 0 ? `Advanced by ${-n0}: everything happens ${-n0} steps earlier.` : "No shift.",
      flip: "Flipped about n = 0: the signal runs backward.",
      amp: A < 0 ? "A negative gain flips the signal upside down as well as scaling it." : "Every value is multiplied by A.",
      down: `Kept samples 0, ±${M}, ±${2 * M}, …; the rest are gone.`,
      up: `${L - 1} zero${L > 2 ? "s" : ""} between each pair of samples. Every original value is still there.`,
    };
    status.textContent = msgs[op];
    status3.textContent = b === 0 || a === 1
      ? "Here both orders give the same signal."
      : `The ramp starts at t = ${fmt(t0, 2)} in x(at + b), but at t = ${fmt(-b, 2)} in the mistake.`;
    p.request(); fe.plot.request(); fo.plot.request(); g.request();
  }
  update();

  return { destroy() { p.destroy(); fe.plot.destroy(); fo.plot.destroy(); g.destroy(); } };
}
