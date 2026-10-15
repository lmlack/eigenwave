// Lesson 12: linear and time-invariant. Pick a system, then test it: does
// the output of a combination equal the combination of outputs? Does
// shifting the input just shift the output? Plus causal, memoryless and
// stable, each with a reason.

import { figure } from "../plot.js";
import { button, controls, el, legend, lessonCss, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { SYSTEMS, fromArray, linearityGap, scaleAdd, shift, shiftGap } from "./systems-math.js";
import { mulberry32 } from "../cmath.js";

// On a phone, wide plots get taller and choose their own tick spacing.
const narrow = window.matchMedia("(max-width: 640px)").matches;
const asp = (a) => (narrow ? Math.min(a, 1.8) : a);
const tk = (t) => (narrow ? undefined : t);

const NS = Array.from({ length: 21 }, (_, i) => i - 8); // n = -8 … 12
const X0 = [-8.6, 12.6];

export function mount(root) {
  lessonCss("systems");
  const plots = [];
  let sys = SYSTEMS[0];
  let a = 1.5, b = -1, n0 = 3;
  let seed = 4;
  let x1, x2;
  const PRESET1 = [1, 2, 1], PRESET2 = [0.5, -1, 0, 1.5];
  x1 = fromArray(PRESET1, 0);
  x2 = fromArray(PRESET2, 2);

  root.append(prose(`
    <p>A <b>system</b> takes a signal in and gives a signal out. Turning up a volume knob is a system. So is an echo, a blur, or a running total. We write ${inl("y = T\\{x\\}")}: the system ${inl("T")} turns the input ${inl("x")} into the output ${inl("y")}.</p>
    <p>Two properties matter more than any others. A system is <b>linear</b> if it respects linear combinations: put in ${inl("a x_1 + b x_2")} and you get ${inl("a y_1 + b y_2")}. It's <b>time-invariant</b> if it doesn't care when you use it: delay the input and the output is the same, just delayed. A system that's both is called <b>LTI</b> (linear time-invariant), and almost everything in the rest of the course only works for LTI systems.</p>
    <p>Pick a system and test it.</p>`));

  /* ---------- Picker ---------- */
  const pick = el("div", { class: "btn-row sys-pick", role: "group", "aria-label": "System" });
  const pickBtns = SYSTEMS.map((s) => {
    const b2 = button(s.name, () => { sys = s; update(); });
    b2.setAttribute("aria-pressed", "false");
    pick.append(b2);
    return b2;
  });
  const formula = el("div", { class: "sys-formula" });
  root.append(panel("Choose a system", pick, formula));

  /* ---------- Inputs ---------- */
  const fIn = figure({ x: X0, y: [-2.5, 2.5], aspect: asp(3), xTicks: tk(2), vAxis: false, cap: "The two test inputs, x₁ and x₂." });
  plots.push(fIn.plot);
  fIn.plot.draw((p) => {
    p.stems(NS.map((n) => n - 0.12), NS.map((n) => x1(n)), { color: p.c.blue });
    p.stems(NS.map((n) => n + 0.12), NS.map((n) => x2(n)), { color: p.c.green });
  });
  const newInputs = button("New inputs", () => {
    const r = mulberry32(seed++);
    x1 = fromArray(Array.from({ length: 4 }, () => Math.round((r() * 4 - 2) * 2) / 2), Math.floor(r() * 4) - 2);
    x2 = fromArray(Array.from({ length: 4 }, () => Math.round((r() * 4 - 2) * 2) / 2), Math.floor(r() * 5));
    update();
  });
  root.append(panel("The inputs", fIn.el, legend([["--blue", "x₁"], ["--green", "x₂"]]), el("div", { class: "btn-row", style: "margin-top:10px" }, newInputs)));

  /* ---------- Linearity ---------- */
  const fL = figure({ x: X0, y: [-4, 4], aspect: asp(2.6), xTicks: tk(2), vAxis: false, cap: "Blue sticks: the system's output for a x₁ + b x₂. Orange rings: a times the output for x₁, plus b times the output for x₂." });
  plots.push(fL.plot);
  const lin = { left: null, right: null };
  fL.plot.draw((p) => {
    p.stems(NS, NS.map((n) => lin.left(n)), { color: p.c.blue });
    NS.forEach((n) => p.dot(n, lin.right(n), { r: 6, color: "transparent", stroke: p.c.accent }));
  });
  const sA = slider({ label: "a", min: -2, max: 2, step: 0.5, value: a, onInput: (v) => { a = v; update(); } });
  const sB = slider({ label: "b", min: -2, max: 2, step: 0.5, value: b, onInput: (v) => { b = v; update(); } });
  const vLin = el("p", { class: "verdict" });
  root.append(panel("Test 1: is it linear?", fL.el,
    legend([["--blue", "T{a x₁ + b x₂}"], ["--accent", "a T{x₁} + b T{x₂}"]]),
    controls(sA.el, sB.el), vLin));

  /* ---------- Time invariance ---------- */
  const fT = figure({ x: X0, y: [-4, 4], aspect: asp(2.6), xTicks: tk(2), vAxis: false, cap: "Blue sticks: shift x₁ by n₀ first, then run the system. Orange rings: run the system first, then shift the output by n₀." });
  plots.push(fT.plot);
  const ti = { first: null, after: null };
  fT.plot.draw((p) => {
    p.stems(NS, NS.map((n) => ti.first(n)), { color: p.c.blue });
    NS.forEach((n) => p.dot(n, ti.after(n), { r: 6, color: "transparent", stroke: p.c.accent }));
  });
  const sN = slider({ label: "Shift n₀", min: -4, max: 6, step: 1, value: n0, format: (v) => String(v), onInput: (v) => { n0 = v; update(); } });
  const vTi = el("p", { class: "verdict" });
  root.append(panel("Test 2: is it time-invariant?", fT.el,
    legend([["--blue", "T{x₁[n − n₀]}"], ["--accent", "y₁[n − n₀]"]]),
    controls(sN.el), vTi));

  /* ---------- Properties ---------- */
  const table = el("table", { class: "props" });
  root.append(panel("Its other properties", prose(`<p>Three more questions people ask about a system. <b>Causal</b>: does it only use the present and the past? Anything running in real time has to be. <b>Memoryless</b>: does each output use only the input at that same instant? <b>Stable</b>: does every bounded input give a bounded output? (People call this BIBO stability, for bounded input, bounded output.)</p>`), table));

  root.append(tryIt([
    "Pick y = x². The rings and sticks split apart: the output of a sum isn't the sum of the outputs. Set a = 1 and b = 0 and they match again, but only because there's nothing to add.",
    "Pick y = x + 1 and set a = b = 0. Zero goes in and 1s come out. A linear system always maps zero to zero.",
    "Pick y = n·x and drag the shift. The shapes match only at n₀ = 0, because the gain depends on when the input arrives.",
    "Pick y = x[2n] and set n₀ = 2. The blue output has only moved by 1: the system squeezes time in half, so a shift gets halved too. Try n₀ = 1 and it keeps a different half of the samples altogether.",
  ]));

  const m = mathPanel([
    { tex: "y[n] = T\\{x\\}[n]", note: "The system T turns the input signal x into the output signal y." },
    { tex: "T\\{a\\,x_1 + b\\,x_2\\} = a\\,T\\{x_1\\} + b\\,T\\{x_2\\}", note: "<b>Linear:</b> this holds for every pair of inputs and every pair of numbers a, b." },
    { id: "lin", tex: "" },
    { tex: "y[n] = T\\{x\\}[n] \\;\\Rightarrow\\; T\\{x[\\cdot - n_0]\\}[n] = y[n - n_0]", note: "<b>Time-invariant:</b> delay the input by n₀ and the output is the same, delayed by n₀." },
    { id: "ti", tex: "" },
    { id: "sys", tex: "" },
  ], [
    ["T", "the system: the rule that turns a signal into another signal"],
    ["x,\\ y", "the input and output signals"],
    ["x_1,\\ x_2", "two test inputs"],
    ["a,\\ b", "the numbers used to combine them"],
    ["n", "the sample number"],
    ["n_0", "how far the input is shifted"],
    ["\\max_n |\\cdot|", "the biggest gap between the two sides over the samples shown"],
  ]);
  root.append(m.el);
  root.append(upNext("convolution. For an LTI system, the response to one impulse tells you the response to everything."));

  function update() {
    pickBtns.forEach((b2, i) => {
      const on = SYSTEMS[i] === sys;
      b2.setAttribute("aria-pressed", String(on));
      b2.classList.toggle("solid", on);
    });
    formula.innerHTML = `<span class="small subtle">The rule:</span> ${inl(sys.tex)}`;
    const T = sys.f;
    lin.left = T(scaleAdd(a, x1, b, x2));
    const y1 = T(x1), y2 = T(x2);
    lin.right = (n) => a * y1(n) + b * y2(n);
    ti.first = T(shift(x1, n0));
    ti.after = shift(y1, n0);
    autoscale(fL.plot, [lin.left, lin.right]);
    autoscale(fT.plot, [ti.first, ti.after]);
    const gL = linearityGap(sys, x1, x2, a, b, NS);
    const gT = shiftGap(sys, x1, n0, NS);
    vLin.className = `verdict ${gL < 1e-9 ? "ok" : "bad"}`;
    vLin.innerHTML = gL < 1e-9
      ? `They match here.${sys.linear ? " And they always will: " + sys.why.linear : " Try other a and b, or new inputs: " + sys.why.linear}`
      : `They don't match: the biggest gap is ${gapText(gL)}. ${sys.why.linear}`;
    vTi.className = `verdict ${gT < 1e-9 ? "ok" : "bad"}`;
    vTi.innerHTML = gT < 1e-9
      ? `They match here.${sys.ti ? " And they always will: " + sys.why.ti : " Try another shift: " + sys.why.ti}`
      : `They don't match: the biggest gap is ${gapText(gT)}. ${sys.why.ti}`;
    const rows = [
      ["Linear", sys.linear, sys.why.linear],
      ["Time-invariant", sys.ti, sys.why.ti],
      ["Causal", sys.causal, sys.why.causal],
      ["Memoryless", sys.memoryless, sys.why.memoryless],
      ["Stable (BIBO)", sys.stable, sys.why.stable],
    ];
    const lti = sys.linear && sys.ti;
    table.innerHTML = rows.map(([k, v, why]) => `<tr><th>${k}</th><td class="${v ? "yes" : "no"}">${v ? "Yes" : "No"}</td><td>${why}</td></tr>`).join("")
      + `<tr class="lti"><th>LTI</th><td class="${lti ? "yes" : "no"}">${lti ? "Yes" : "No"}</td><td>${lti ? "Linear and time-invariant, so everything that follows applies to it." : "It fails at least one of the two tests, so convolution and Fourier won't describe it."}</td></tr>`;
    m.set("lin", `\\max_n \\big|T\\{${num(a, 1)}\\,x_1 ${b < 0 ? "-" : "+"} ${num(Math.abs(b), 1)}\\,x_2\\} - (${num(a, 1)}\\,y_1 ${b < 0 ? "-" : "+"} ${num(Math.abs(b), 1)}\\,y_2)\\big| = ${num(gL, 2)}`);
    m.set("ti", `\\max_n \\big|T\\{x_1[\\cdot - ${n0 < 0 ? `(${n0})` : n0}]\\}[n] - y_1[n - ${n0 < 0 ? `(${n0})` : n0}]\\big| = ${num(gT, 2)}`);
    m.set("sys", `\\text{This system: } ${sys.tex}`);
    plots.forEach((p) => p.request());
  }
  update();

  return { destroy() { plots.forEach((p) => p.destroy()); } };
}

const gapText = (g) => (g >= 100 ? g.toFixed(0) : g.toFixed(2));

/** Fit the y range to the signals shown, with a little headroom. */
function autoscale(p, fs) {
  let m = 1;
  for (const f of fs) for (const n of NS) m = Math.max(m, Math.abs(f(n)));
  m = Math.min(m * 1.15, 400);
  p.setRange(null, [-m, m]);
}
