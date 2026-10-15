// Lesson 11: impulses, steps and exponentials. The signals every other signal
// is built from: the unit impulse and step (and how each makes the other),
// real exponentials a^n, complex exponentials z^n as a spiral, and discrete
// sinusoids, which only repeat when the frequency is a fraction of π.

import { animate, figure } from "../plot.js";
import { button, check, controls, el, fmt, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { delta, periodOf, reduce, step } from "./basics-math.js";

// On a phone, wide plots get taller and choose their own tick spacing.
const narrow = window.matchMedia("(max-width: 640px)").matches;
const asp = (a) => (narrow ? Math.min(a, 1.8) : a);
const tk = (t) => (narrow ? undefined : t);

const NS = Array.from({ length: 21 }, (_, i) => i - 6); // n = -6 … 14

export function mount(root) {
  const plots = [];
  const anims = [];

  root.append(prose(`
    <p>A few signals show up everywhere, because everything else gets built out of them. The simplest is the <b>unit impulse</b> ${inl("\\delta[n]")}: 1 at ${inl("n = 0")} and 0 everywhere else. Next is the <b>unit step</b> ${inl("u[n]")}: 0 before ${inl("n = 0")}, 1 from there on, like a switch being flipped.</p>
    <p>They're two views of the same thing. Add up the impulse as you go and you get the step. Take the step and look at how much it changed since the last sample, and you get the impulse back.</p>`));

  /* ---------- Figure 1: impulse and step ---------- */
  let n0 = 0, cur = 3;
  const fA = figure({ x: [-6.6, 14.6], y: [-0.4, 1.5], aspect: asp(3), xTicks: tk(2), vAxis: false, cap: "δ[n − n₀]: one impulse, moved to n₀." });
  const fB = figure({ x: [-6.6, 14.6], y: [-0.4, 1.5], aspect: asp(3), xTicks: tk(2), vAxis: false, cap: "u[n − n₀]: the running sum of the impulse. Drag across either plot to move the cursor n." });
  const pA = fA.plot, pB = fB.plot;
  plots.push(pA, pB);
  pA.draw((p) => {
    const ys = NS.map((n) => delta(n - n0));
    p.stems(NS, ys, { color: p.c.blue });
    cursor(p);
  });
  pB.draw((p) => {
    const ys = NS.map((n) => step(n - n0));
    // The samples the running sum has covered so far are lit; the rest are faint.
    const lit = NS.filter((n) => n <= cur);
    p.stems(NS.filter((n) => n > cur), NS.filter((n) => n > cur).map((n) => step(n - n0)), { color: p.c.green, alpha: 0.3 });
    p.stems(lit, lit.map((n) => step(n - n0)), { color: p.c.green });
    cursor(p);
    void ys;
  });
  function cursor(p) {
    p.line(cur, -0.4, cur, 1.5, { color: p.c.accent, width: 1.5, dash: [4, 4] });
    p.text(`n = ${cur}`, cur, 1.38, { color: p.c.accent, dx: 6, size: 12 });
  }
  const moveCursor = (wx) => {
    cur = Math.max(-6, Math.min(14, Math.round(wx)));
    update1();
  };
  pA.onDrag = moveCursor;
  pB.onDrag = moveCursor;
  const sShift = slider({ label: "Shift n₀", min: -4, max: 10, step: 1, value: 0, format: (v) => String(v), onInput: (v) => { n0 = v; update1(); } });
  const read1 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Impulse and step", fA.el, fB.el, controls(sShift.el), read1));

  /* ---------- Figure 2: real exponential ---------- */
  root.append(prose(`
    <p>Next, the <b>real exponential</b> ${inl("x[n] = a^n")}. Each sample is the one before it times ${inl("a")}. The value of ${inl("a")} decides what happens: bigger than 1 and it grows, between 0 and 1 and it dies away, negative and it flips sign every step.</p>`));
  let a = 0.8;
  const N2 = Array.from({ length: 21 }, (_, i) => i);
  const f2 = figure({ x: [-0.6, 20.6], y: [-3, 3], aspect: asp(2.6), xTicks: tk(2), vAxis: false, cap: "aⁿ for n = 0 … 20. Values past ±3 are cut off at the edge." });
  const p2 = f2.plot;
  plots.push(p2);
  p2.draw((p) => {
    const ys = N2.map((n) => a ** n);
    const clip = ys.map((y) => Math.max(-2.9, Math.min(2.9, y)));
    p.stems(N2, clip, { color: p.c.blue });
    ys.forEach((y, i) => { if (Math.abs(y) > 2.9) p.text("↑", N2[i], clip[i], { color: p.c.accent, align: "center", dy: y > 0 ? -10 : 10, size: 12 }); });
  });
  const verdict2 = el("p", { class: "small", style: "margin:10px 0 0" });
  const sA = slider({ label: "a", min: -1.3, max: 1.3, step: 0.01, value: a, onInput: (v) => { a = v; update2(); } });
  const presets2 = el("div", { class: "btn-row" },
    ...[[0.8, "Decay"], [1.1, "Growth"], [-0.85, "Alternating"], [1, "Constant"]].map(([v, t]) => button(t, () => { a = v; sA.set(v); update2(); })));
  root.append(panel("Real exponentials", f2.el, controls(sA.el, presets2), verdict2));

  /* ---------- Figure 3: complex exponential ---------- */
  root.append(prose(`
    <p>Now let ${inl("a")} be a complex number ${inl("z = r\\,e^{i\\theta}")}. Multiplying by ${inl("z")} scales by ${inl("r")} and turns by the angle ${inl("\\theta")}, so the samples ${inl("z^n")} walk around the origin: a circle when ${inl("r = 1")}, a spiral in or out otherwise. The real part of that walk is a sinusoid, decaying or growing with ${inl("r")}. This is the signal the whole Fourier half of the course is about.</p>
    <p>So the <b>unit circle</b>, the circle of radius 1, is the dividing line. Where ${inl("z")} sits tells you what ${inl("z^n")} does:</p>
    <ul>
      <li><b>Inside</b> (${inl("r < 1")}): it spirals in and dies out.</li>
      <li><b>On the circle</b> (${inl("r = 1")}): it goes round forever at the same size, a pure, steady wave. These are the waves Fourier analysis is built from.</li>
      <li><b>Outside</b> (${inl("r > 1")}): it spirals out and blows up.</li>
    </ul>
    <p>And the angle ${inl("\\theta")} is the frequency: how far it turns per sample. Turning by ${inl("\\theta")} and by ${inl("\\theta + 2\\pi")} lands on the same point, which is why those two frequencies give identical samples (the next figure shows it). The z-transform, near the end of the course, uses this same picture for whole systems.</p>`));
  let r = 0.95, th = Math.PI / 6, nOn = 0, playing = true, tAcc = 0;
  const NZ = 30;
  const f3a = figure({ x: [-1.4, 1.4], y: [-1.4, 1.4], equal: true, aspect: 1, xTicks: tk(0.5), yTicks: 0.5, cap: "zⁿ in the complex plane. Lines join one sample to the next." });
  const f3b = figure({ x: [-0.6, NZ + 0.6], y: [-1.5, 1.5], aspect: 1.6, xTicks: tk(5), vAxis: false, cap: "Real part rⁿ cos(θn) in blue, imaginary part in purple." });
  const p3a = f3a.plot, p3b = f3b.plot;
  plots.push(p3a, p3b);
  const zn = (n) => [r ** n * Math.cos(th * n), r ** n * Math.sin(th * n)];
  const clamp = (v) => Math.max(-1.38, Math.min(1.38, v));
  p3a.draw((p) => {
    p.circle(0, 0, 1, { color: p.c.lineStrong, width: 1, dash: [4, 4] });
    const pts = Array.from({ length: NZ + 1 }, (_, n) => zn(n)).filter(([x, y]) => Math.hypot(x, y) < 1.4);
    p.path(pts, { color: p.c.blue, width: 1.2, alpha: 0.5 });
    pts.forEach(([x, y]) => p.dot(x, y, { r: 2.5, color: p.c.blue }));
    const [x, y] = zn(nOn);
    if (Math.hypot(x, y) < 1.4) {
      p.arrow(0, 0, x, y, { color: p.c.accent, width: 2.5 });
      p.text(`z^${nOn}`, x, y, { color: p.c.accent, dx: 8, dy: -10 });
    }
  });
  p3b.draw((p) => {
    const ns = Array.from({ length: NZ + 1 }, (_, n) => n);
    p.fn((t) => clamp(r ** t * Math.cos(th * t)), { color: p.c.blue, width: 1, alpha: 0.35, from: 0, to: NZ });
    p.stems(ns, ns.map((n) => clamp(zn(n)[1])), { color: p.c.purple, r: 2.5, width: 1, alpha: 0.55 });
    p.stems(ns, ns.map((n) => clamp(zn(n)[0])), { color: p.c.blue });
    p.line(nOn, -1.5, nOn, 1.5, { color: p.c.accent, width: 1.5, dash: [4, 4] });
  });
  const sR = slider({ label: "r = |z|", min: 0.8, max: 1.08, step: 0.005, value: r, format: (v) => fmt(v, 3), onInput: (v) => { r = v; update3(); } });
  const sTh = slider({ label: "θ, the turn per step", min: 0, max: Math.PI, step: Math.PI / 96, value: th, format: (v) => `${fmt((v * 180) / Math.PI, 1)}°`, onInput: (v) => { th = v; update3(); } });
  const play = check({ label: "Play", checked: true, onChange: (v) => { playing = v; if (v) anim3.kick(); } });
  root.append(panel("Complex exponentials", el("div", { class: "fig-row" }, f3a.el, f3b.el),
    legend([["--blue", "real part"], ["--purple", "imaginary part"], ["--accent", "the current sample"]]),
    controls(sR.el, sTh.el, play.el)));
  const anim3 = animate(f3a.el, (dt) => {
    tAcc += dt;
    if (tAcc > 0.35) { tAcc = 0; nOn = (nOn + 1) % (NZ + 1); p3a.request(); p3b.request(); }
  }, () => playing);
  anims.push(anim3);

  /* ---------- Figure 4: discrete sinusoids ---------- */
  root.append(prose(`
    <p>Sinusoids in discrete time have two surprises. First, ${inl("\\cos(\\omega n)")} only repeats if ${inl("\\omega")} is a fraction of ${inl("\\pi")}: it has to come back to the start after a whole number of samples. With ${inl("\\omega = 1")} it never quite does. Second, frequencies ${inl("2\\pi")} apart are the same signal: ${inl("\\cos((\\omega + 2\\pi)n) = \\cos(\\omega n)")} at every whole ${inl("n")}. So the frequencies only run from 0 to ${inl("\\pi")}, and the fastest a discrete signal can wiggle is ${inl("\\omega = \\pi")}: +1, −1, +1, −1.</p>`));
  const DEN = 24; // ω slider counts in steps of π/24
  let wp = 3, exactOne = false, show2pi = false;
  const N4 = Array.from({ length: 33 }, (_, i) => i);
  const f4 = figure({ x: [-0.6, 32.6], y: [-1.4, 1.4], aspect: asp(2.6), xTicks: tk(4), vAxis: false, cap: "cos(ωn) for n = 0 … 32. The faint curve is cos(ωt) between the samples." });
  const p4 = f4.plot;
  plots.push(p4);
  const omega = () => (exactOne ? 1 : (wp * Math.PI) / DEN);
  p4.draw((p) => {
    const w = omega();
    p.fn((t) => Math.cos(w * t), { color: p.c.blue, width: 1, alpha: 0.35 });
    if (show2pi) p.fn((t) => Math.cos((w + 2 * Math.PI) * t), { color: p.c.green, width: 1, alpha: 0.55 });
    p.stems(N4, N4.map((n) => Math.cos(w * n)), { color: p.c.blue });
    const per = exactOne ? 0 : periodOf(...reduce(wp, DEN));
    if (per && per <= 32) p.rect(0, -1.4, per, 1.4, { fill: p.c.accent, alpha: 0.08 });
  });
  const sW = slider({ label: "ω", min: 0, max: 2 * DEN, step: 1, value: wp, format: (v) => fracPi(v), onInput: (v) => { wp = v; exactOne = false; update4(); } });
  const one = button("ω = 1 (not a fraction of π)", () => { exactOne = true; update4(); });
  const c2pi = check({ label: "Also draw cos((ω + 2π)t)", onChange: (v) => { show2pi = v; p4.request(); } });
  const verdict4 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Discrete sinusoids", f4.el, controls(sW.el, el("div", { class: "btn-row" }, one), c2pi.el), verdict4));

  root.append(tryIt([
    "Drag the cursor across the step. Every sample it covers adds one more impulse to the sum, and the sum only changes at n₀.",
    "Set a to −0.85. The samples flip sign every step and shrink: an alternating decay.",
    "Set r = 1 and θ = 30°. The samples land on the circle and repeat every 12 steps. Lower r a little and the circle becomes a spiral, and the real part rings down.",
    "Slide ω up past π. The dots start repeating what they did below π, just backwards. Turn on the ω + 2π curve: it wiggles far faster but passes through the exact same dots.",
  ]));

  /* ---------- The math ---------- */
  const m = mathPanel([
    { tex: "\\delta[n] = \\begin{cases} 1 & n = 0 \\\\ 0 & n \\ne 0 \\end{cases} \\qquad u[n] = \\begin{cases} 1 & n \\ge 0 \\\\ 0 & n < 0 \\end{cases}" },
    { tex: "u[n] = \\sum_{k=-\\infty}^{n} \\delta[k], \\qquad \\delta[n] = u[n] - u[n-1]",
      note: "The step is the running sum of the impulse; the impulse is the step's first difference." },
    { id: "sum", tex: "" },
    { tex: "x[n] = a^n, \\qquad x[n+1] = a\\,x[n]", note: "Each sample is the last one times a." },
    { id: "exp", tex: "" },
    { tex: "z^n = r^n e^{i\\theta n} = r^n\\big(\\cos(\\theta n) + i \\sin(\\theta n)\\big)",
      note: "Euler's formula splits the spiral into its real and imaginary parts." },
    { id: "cplx", tex: "" },
    { tex: "\\cos\\big((\\omega + 2\\pi) n\\big) = \\cos(\\omega n + 2\\pi n) = \\cos(\\omega n)",
      note: "2πn is a whole number of turns, so it changes nothing." },
    { tex: "\\cos(\\omega(n + N)) = \\cos(\\omega n) \\iff \\omega N = 2\\pi m \\iff \\frac{\\omega}{2\\pi} = \\frac{m}{N}",
      note: "Periodic only when ω/2π is a fraction. The period N is the smallest such whole number." },
    { id: "per", tex: "" },
  ], [
    ["n", "the sample number, a whole number"],
    ["\\delta[n]", "the unit impulse: 1 at n = 0, 0 elsewhere"],
    ["u[n]", "the unit step: 0 before n = 0, 1 from then on"],
    ["n_0", "how far the impulse or step has been moved"],
    ["k", "the counting variable inside the sum"],
    ["a", "the ratio from one sample to the next in aⁿ"],
    ["z", "a complex number; zⁿ is the complex exponential"],
    ["r", "the size |z|: how much each step scales"],
    ["\\theta", "the angle of z: how far each step turns"],
    ["i", "the square root of −1"],
    ["\\omega", "the frequency of a discrete sinusoid, in radians per sample"],
    ["N", "the period: how many samples before it repeats"],
    ["m", "a whole number of turns"],
  ]);
  root.append(m.el);
  root.append(upNext("systems. A system takes a signal in and gives a signal out, and two properties, linear and time-invariant, make the rest of the course possible."));

  function update1() {
    const s = step(cur - n0);
    read1.innerHTML = `At n = ${cur}: the sum of δ[k − n₀] up to n is <b>${s}</b>, which is u[n − n₀]. And u[n − n₀] − u[n − 1 − n₀] = <b>${s - step(cur - 1 - n0)}</b>, which is δ[n − n₀].`;
    m.set("sum", `u[${cur} - ${par(n0)}] = \\sum_{k \\le ${cur}} \\delta[k - ${par(n0)}] = ${s}`);
    pA.request(); pB.request();
  }
  function update2() {
    sA.set(a);
    const kind = Math.abs(a) < 1e-9 ? "Everything after the first sample is 0."
      : Math.abs(Math.abs(a) - 1) < 0.005 ? (a > 0 ? "a = 1: every sample is the same. A constant." : "a = −1: it flips between +1 and −1 forever, the fastest possible wiggle.")
      : Math.abs(a) < 1 ? (a > 0 ? "|a| < 1: it decays toward 0." : "|a| < 1 and a < 0: it decays, flipping sign every step.")
      : (a > 0 ? "a > 1: it grows without limit." : "|a| > 1 and a < 0: it grows, flipping sign every step.");
    verdict2.textContent = kind;
    m.set("exp", `a = ${num(a)}: \\quad x[0..4] = ${[0, 1, 2, 3, 4].map((n) => num(a ** n)).join(",\\ ")}`);
    p2.request();
  }
  function update3() {
    const z = zn(1);
    m.set("cplx", `z = ${num(r, 3)}\\,e^{i\\,${num((th * 180) / Math.PI, 1)}^\\circ} = ${num(z[0], 3)} ${z[1] < 0 ? "-" : "+"} ${num(Math.abs(z[1]), 3)}\\,i`);
    p3a.request(); p3b.request();
  }
  function update4() {
    const [p, q] = reduce(wp, DEN);
    const per = periodOf(p, q);
    if (exactOne) {
      verdict4.textContent = "ω = 1 radian: 1/2π isn't a fraction, so the dots never repeat exactly. The curve does repeat (every 2π ≈ 6.28), but the samples land in a new place each time.";
      m.set("per", "\\omega = 1: \\quad \\frac{\\omega}{2\\pi} = \\frac{1}{2\\pi} \\text{ is not a fraction, so no period}");
    } else {
      const fast = wp === DEN ? " This is ω = π, the fastest wiggle: +1, −1, +1, −1." : wp > DEN ? ` Above π it matches ω = ${fracPi(2 * DEN - wp)}: the same dots.` : "";
      verdict4.textContent = `ω = ${fracPi(wp)}: it repeats every ${per} sample${per === 1 ? "" : "s"} (shaded).${fast}`;
      const [m1, n1] = reduce(p, 2 * q);
      const frac = n1 !== 2 * q ? ` = \\frac{${m1}}{${n1}}` : "";
      m.set("per", `\\omega = ${texPi(p, q)}: \\quad \\frac{\\omega}{2\\pi} = \\frac{${p}}{${2 * q}}${frac} \\Rightarrow N = ${per}`);
    }
    p4.request();
  }
  update1(); update2(); update3(); update4();

  return {
    destroy() {
      plots.forEach((p) => p.destroy());
      anims.forEach((x) => x.stop());
    },
  };
}

const par = (v) => (v < 0 ? `(${v})` : String(v));

/** A slider value counted in π/24 as readable text: 3 → "π/8". */
function fracPi(v) {
  const [p, q] = reduce(v, 24);
  if (p === 0) return "0";
  return `${p === 1 ? "" : p}π${q === 1 ? "" : `/${q}`}`;
}
function texPi(p, q) {
  if (p === 0) return "0";
  return q === 1 ? `${p === 1 ? "" : p}\\pi` : `\\frac{${p === 1 ? "" : p}\\pi}{${q}}`;
}
