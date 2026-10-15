// Lesson 25: the Laplace transform and the s-plane. Drag s and see e^{st};
// see how the damping e^{-σt} makes a growing signal transformable (the
// region of convergence); then build a system from poles and zeros and see
// that its frequency response is |H(s)| sliced along the iω axis. The ringing
// impulse response can be heard.

import { figure } from "../plot.js";
import { controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { listenButton, stopAll } from "../audio.js";
import { cabs } from "../cmath.js";
import { expSReal, impulseS, rational, residues, stableS, withConjugates } from "./transforms-math.js";
import { heatmap, poleMark, zeroMark } from "./heatmap.js";

const narrow = window.matchMedia("(max-width: 640px)").matches;

export function mount(root) {
  const plots = [];

  root.append(prose(`
    <p>The Fourier transform builds a signal out of steady waves ${inl("e^{i\\omega t}")}. That works for signals that settle down, but not for ones that grow, like ${inl("e^{t}")}: no mix of steady waves can keep up with it, and the Fourier integral never adds up to a finite number.</p>
    <p>The <b>Laplace transform</b> fixes that by letting the waves grow or shrink too. Its building blocks are ${inl("e^{st}")}, where ${inl("s = \\sigma + i\\omega")} is a complex number. The imaginary part ${inl("\\omega")} sets how fast it wiggles, like before. The new real part ${inl("\\sigma")} sets how fast it grows (${inl("\\sigma > 0")}) or dies out (${inl("\\sigma < 0")}). Every ${inl("s")} is one point in a plane, the <b>s-plane</b>, and that plane is what people mean by the <b>Laplace domain</b> (or the s-domain).</p>`));

  /* ---------- Figure 1: the s-plane and e^{st} ---------- */
  const s = [-0.4, 4];
  const f1 = figure({ x: [-2.5, 1.5], y: [-8, 8], aspect: narrow ? 1 : 0.9, phoneAspect: 1, xLabel: "σ", yLabel: "ω", cap: "The s-plane. Drag the point s." });
  const f2 = figure({ x: [0, 5], y: [-3, 3], aspect: 1.6, xLabel: "t", vAxis: false, cap: "The real part of e<sup>st</sup> = e<sup>σt</sup> cos(ωt), with its envelope ± e<sup>σt</sup> dashed." });
  const p1 = f1.plot, p2 = f2.plot;
  plots.push(p1, p2);
  p1.draw((p) => {
    p.rect(0, -8, 1.5, 8, { fill: p.c.accent, alpha: 0.08 });
    p.rect(-2.5, -8, 0, 8, { fill: p.c.green, alpha: 0.06 });
    p.line(0, -8, 0, 8, { color: p.c.blue, width: 3 });
    p.text("dies out", -1.25, -7, { color: p.c.green, align: "center", size: 12 });
    p.text("grows", 0.75, -7, { color: p.c.accent, align: "center", size: 12 });
    p.text("iω axis: steady", 0, 7.2, { color: p.c.blue, dx: 6, size: 12 });
    // The conjugate point: a real signal needs both.
    p.dot(s[0], -s[1], { r: 4, color: p.c.fgSubtle });
  });
  p1.handle({
    get: () => s, color: (c) => c.purple, label: "s",
    set: (x, y) => { s[0] = Math.max(-2.4, Math.min(1.4, Math.round(x * 20) / 20)); s[1] = Math.max(-7.9, Math.min(7.9, Math.round(y * 10) / 10)); update(); },
  });
  p2.draw((p) => {
    const env = (t) => Math.exp(s[0] * t);
    p.fn(env, { color: p.c.fgSubtle, width: 1.2, dash: [4, 4] });
    p.fn((t) => -env(t), { color: p.c.fgSubtle, width: 1.2, dash: [4, 4] });
    p.fn((t) => expSReal(s, t), { color: p.c.purple, width: 2.5 });
  });
  const read1 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Every point is a signal", el("div", { class: "fig-row" }, f1.el, f2.el), read1));

  root.append(tryIt([
    "Drag s straight up the blue axis (σ = 0). The wave never grows or shrinks: these are exactly the steady waves Fourier uses.",
    "Drag s to the left. The same wave now dies out, faster the further left you go.",
    "Drag s to the right of the axis. It grows without limit.",
    "Drag s onto the horizontal axis (ω = 0). There's no wiggle left: just a plain exponential, rising or falling.",
  ]));

  /* ---------- Figure 3: Laplace = Fourier of x(t) e^{-σt}; the ROC ---------- */
  root.append(prose(`
    <p>Here's the whole trick. The Laplace transform of ${inl("x(t)")} at ${inl("s = \\sigma + i\\omega")} is the Fourier transform of ${inl("x(t)\\,e^{-\\sigma t}")}. Multiplying by ${inl("e^{-\\sigma t}")} tames a growing signal before Fourier sees it. Pick ${inl("\\sigma")} big enough and even ${inl("e^{t}")} gets squashed down to something that dies out.</p>
    <p>The values of ${inl("\\sigma")} where that works form the <b>region of convergence</b> (ROC). For a signal that starts at ${inl("t = 0")} and grows like ${inl("e^{at}")}, the ROC is everything to the right of ${inl("\\sigma = a")}. If the ROC includes the ${inl("i\\omega")} axis (${inl("\\sigma = 0")}), the ordinary Fourier transform exists too, and it's just the Laplace transform read off along that axis.</p>`));
  let a = 0.5, sig = 1;
  const f3 = figure({ x: [0, 6], y: [-0.2, 4], aspect: 1.7, xLabel: "t", vAxis: false, cap: "x(t) = e<sup>at</sup> (blue), the weight e<sup>−σt</sup> (dashed), and their product (purple), which is what Fourier sees." });
  const f4 = figure({ x: [-2, 2], y: [-1, 1], aspect: 3.2, phoneAspect: 2.4, xLabel: "σ", grid: false, ticks: true, yTicks: [[0, ""]], cap: "The ROC (shaded): every σ to the right of a. The line is your σ." });
  const p3 = f3.plot, p4 = f4.plot;
  plots.push(p3, p4);
  p3.draw((p) => {
    p.fn((t) => Math.exp(a * t), { color: p.c.blue, width: 2 });
    p.fn((t) => Math.exp(-sig * t), { color: p.c.fgSubtle, width: 1.5, dash: [5, 4] });
    p.fn((t) => Math.exp((a - sig) * t), { color: p.c.purple, width: 3 });
  });
  p4.draw((p) => {
    p.rect(a, -1, 2, 1, { fill: p.c.green, alpha: 0.18 });
    p.line(0, -1, 0, 1, { color: p.c.blue, width: 3 });
    p.text("iω axis", 0, 0.65, { color: p.c.blue, dx: 6, size: 12 });
    poleMark(p, a, 0, p.c.accent, 6);
    p.text("a", a, -0.55, { color: p.c.accent, dx: 8, size: 12 });
    p.line(sig, -1, sig, 1, { color: p.c.purple, width: 2.5 });
  });
  const sa = slider({ label: "a, how fast x(t) grows", min: -1, max: 1.2, step: 0.05, value: a, onInput: (v) => { a = v; update(); } });
  const ss = slider({ label: "σ, the damping", min: -1.5, max: 2, step: 0.05, value: sig, onInput: (v) => { sig = v; update(); } });
  const read3 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Damping a signal until Fourier can handle it", f3.el, f4.el,
    legend([["--blue", "x(t)"], ["--fg-subtle", "e^(−σt)"], ["--purple", "x(t) e^(−σt)"]]),
    controls(sa.el, ss.el), read3));

  /* ---------- Figure 5: poles, zeros, |H(s)| and the iω slice ---------- */
  root.append(prose(`
    <p>For systems, the Laplace transform turns calculus into algebra: a derivative becomes multiplication by ${inl("s")}. So a system described by a differential equation has a <b>transfer function</b> ${inl("H(s)")} that's a fraction of polynomials in ${inl("s")}. The roots of the bottom are the <b>poles</b>, where ${inl("|H|")} shoots up to infinity. The roots of the top are the <b>zeros</b>, where it drops to nothing.</p>
    <p>Draw ${inl("|H(s)|")} over the whole s-plane and you get a landscape: tall peaks at the poles, pits at the zeros. The frequency response, how the system treats each steady wave, is that landscape sliced along the ${inl("i\\omega")} axis. A pole close to the axis makes a sharp peak in the slice: the system rings at that frequency.</p>`));
  const PRESETS = {
    ring: { poles: [[-0.4, 4]], zeros: [] },
    two: { poles: [[-0.3, 2.5], [-0.6, 5.5]], zeros: [] },
    notch: { poles: [[-1, 4], [-1.5, 0]], zeros: [[0, 4]] },
    low: { poles: [[-1.5, 1.5], [-2, 0]], zeros: [] },
    unstable: { poles: [[0.25, 3.5]], zeros: [] },
  };
  let preset = "ring";
  let poles = PRESETS.ring.poles.map((p) => [...p]), zeros = [];
  const full = () => ({ P: withConjugates(poles), Z: withConjugates(zeros) });

  const f5 = figure({ x: [-3, 1], y: [-7, 7], aspect: narrow ? 1 : 0.85, phoneAspect: 1, xLabel: "σ", yLabel: "ω", cap: "|H(s)| over the s-plane: bright is big. Drag a pole (×) or zero (○); its mirror image follows." });
  const f6 = figure({ x: [0, 7], y: [0, 1.1], aspect: 1.5, xLabel: "ω", vAxis: false, cap: "|H(iω)|: the landscape read along the iω axis. That's the frequency response, the Fourier transform of h(t)." });
  const f7 = figure({ x: [0, 8], y: [-1.1, 1.1], aspect: 2.4, phoneAspect: 1.6, xLabel: "t", vAxis: false, cap: "h(t), the impulse response: what the system does after one sharp kick." });
  const p5 = f5.plot, p6 = f6.plot, p7 = f7.plot;
  plots.push(p5, p6, p7);
  let peak = 1, hmax = 1;
  p5.draw((p) => {
    const { P, Z } = full();
    heatmap(p, (x, y) => cabs(rational([x, y], P, Z)), { res: narrow ? 70 : 100, range: 40 });
    p.line(0, -7, 0, 7, { color: p.c.blue, width: 2.5, alpha: 0.9 });
    for (const q of P) if (q[1] < 0) poleMark(p, q[0], q[1], p.c.fg, 6);
    for (const q of Z) if (q[1] < 0) zeroMark(p, q[0], q[1], p.c.fg, 6);
  });
  const handleFor = (list, i, kind) => ({
    get: () => list()[i],
    set: (x, y) => {
      const pt = list()[i];
      pt[0] = Math.max(-2.9, Math.min(0.9, Math.round(x * 20) / 20));
      // Drag into the lower half and the pair just flips; snap to the real axis near it.
      const w = Math.abs(y);
      pt[1] = w < 0.25 ? 0 : Math.min(6.9, Math.round(w * 20) / 20);
      update();
    },
    visible: () => i < list().length,
    draw: (p, x, y) => (kind === "pole" ? poleMark(p, x, y, p.c.accent, 8) : zeroMark(p, x, y, p.c.accent, 8)),
  });
  function rebuildHandles() {
    p5.handles = [];
    poles.forEach((_, i) => p5.handle(handleFor(() => poles, i, "pole")));
    zeros.forEach((_, i) => p5.handle(handleFor(() => zeros, i, "zero")));
  }
  rebuildHandles();
  p6.draw((p) => {
    const { P, Z } = full();
    const st = stableS(P);
    p.fn((w) => cabs(rational([0, w], P, Z)) / peak, { color: p.c.blue, width: 2.5, dash: st ? null : [6, 5], alpha: st ? 1 : 0.5 });
    if (!st) p.text("unstable: no frequency response", 3.5, 0.95, { color: p.c.accent, align: "center", size: 12 });
    for (const q of P) if (q[1] > 0 && q[1] < 7) p.line(q[1], 0, q[1], 1.1, { color: p.c.accent, width: 1, dash: [3, 4] });
  });
  p7.draw((p) => {
    const res = residues(full().P, full().Z);
    p.fn((t) => impulseS(t, res) / hmax, { color: p.c.purple, width: 2 });
  });
  const pre = segmented({
    label: "System", value: preset,
    options: [["ring", "One ringing pair"], ["two", "Two pairs"], ["notch", "Pair + zero"], ["low", "Smooth low-pass"], ["unstable", "Unstable"]],
    onChange: (v) => { preset = v; poles = PRESETS[v].poles.map((q) => [...q]); zeros = PRESETS[v].zeros.map((q) => [...q]); rebuildHandles(); update(); },
  });
  // Hear it: the impulse response, sped up so the ring lands in the audible range.
  // Pitch scales ω up a lot; decay scales σ only a little, so it rings long enough to hear.
  const KF = (2 * Math.PI * 440) / 4, KD = 1.5;
  const listen = listenButton("Hear h(t) ring", () => {
    const res = residues(full().P, full().Z).map(({ p, r }) => ({ p: [p[0] * KD, p[1] * KF], r }));
    const unstable = !stableS(full().P);
    const rate = 22050, dur = unstable ? 1.2 : 3;
    const out = new Float32Array(Math.round(rate * dur));
    for (let i = 0; i < out.length; i++) out[i] = impulseS(i / rate, res);
    return { samples: out, rate };
  });
  const read5 = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Poles, zeros and the frequency response",
    f5.el, el("div", { class: "fig-row" }, f6.el, f7.el),
    el("div", { class: "controls", style: "grid-template-columns: 1fr" }, pre.el),
    el("div", { class: "btn-row", style: "margin-top:10px" }, listen.el),
    read5));

  root.append(tryIt([
    "With “One ringing pair”, drag the pole toward the blue axis. Its peak in the slice gets taller and thinner, and h(t) rings longer. Press “Hear h(t) ring” to hear it: a pure tone that fades.",
    "Drag the pole up and down. The peak in |H(iω)| follows it, and the tone you hear changes pitch.",
    "Pick “Pair + zero”. The zero sits right on the axis, so the slice drops to nothing at that ω: a notch filter that blocks one frequency.",
    "Pick “Unstable”. The pole is right of the axis, h(t) grows without limit, and the sound gets louder until it's cut off.",
  ]));

  const m = mathPanel([
    { tex: "X(s) = \\int_{0}^{\\infty} x(t)\\, e^{-st}\\, dt, \\qquad s = \\sigma + i\\omega",
      note: "The (one-sided) Laplace transform: how much of each growing or shrinking wave e<sup>st</sup> the signal holds." },
    { tex: "X(\\sigma + i\\omega) = \\int_{0}^{\\infty} \\big(x(t)\\, e^{-\\sigma t}\\big)\\, e^{-i\\omega t}\\, dt",
      note: "Split e<sup>−st</sup> into e<sup>−σt</sup> and e<sup>−iωt</sup>: it's the Fourier transform of the damped signal." },
    { tex: "\\sigma = 0:\\quad X(i\\omega) = \\int_{0}^{\\infty} x(t)\\, e^{-i\\omega t}\\, dt = \\text{the Fourier transform}",
      note: "On the iω axis the damping is gone. That's why the frequency response is the s-plane read along that axis." },
    { id: "s", tex: "" },
    { tex: "\\frac{d}{dt}x(t) \\;\\longleftrightarrow\\; s\\,X(s) - x(0)",
      note: "A derivative becomes multiplication by s. That turns a differential equation into algebra and gives a fraction H(s)." },
    { tex: "H(s) = g\\,\\frac{(s - q_1)(s - q_2)\\cdots}{(s - p_1)(s - p_2)\\cdots}, \\qquad h(t) = \\sum_k r_k\\, e^{p_k t}",
      note: "The impulse response is one decaying (or growing) wave per pole. A pole's real part sets how fast its wave dies; its imaginary part sets the pitch." },
    { id: "poles", tex: "" },
  ], [
    ["s", "a complex frequency, a point in the s-plane"],
    ["\\sigma", "the real part of s: growth (positive) or decay (negative) per second"],
    ["\\omega", "the imaginary part of s: how fast it wiggles, in radians per second"],
    ["e^{st}", "the building block: e<sup>σt</sup> times a steady wave e<sup>iωt</sup>"],
    ["x(t),\\ X(s)", "a signal and its Laplace transform"],
    ["a", "how fast the example signal e<sup>at</sup> grows"],
    ["H(s)", "the transfer function: output over input, for each s"],
    ["p_k,\\ q_k", "poles (where H blows up) and zeros (where H is zero)"],
    ["g", "an overall gain"],
    ["r_k", "the residue: how much of the wave e<sup>p<sub>k</sub>t</sup> is in h(t)"],
    ["h(t)", "the impulse response"],
    ["\\text{ROC}", "region of convergence: the σ values where the integral adds up"],
  ]);
  root.append(m.el);
  root.append(upNext("the z-transform: the same idea for sampled signals, where the s-plane's iω axis becomes the unit circle."));

  function update() {
    // Figure 1
    const sv = s[0], wv = s[1];
    read1.textContent = Math.abs(sv) < 1e-9
      ? `σ = 0: a steady wave at ω = ${fmt(wv, 1)} rad/s. This is a Fourier building block.`
      : sv < 0
        ? `σ = ${fmt(sv, 2)}: the wave dies out, halving every ${fmt(Math.LN2 / -sv, 2)} s.`
        : `σ = ${fmt(sv, 2)}: the wave grows, doubling every ${fmt(Math.LN2 / sv, 2)} s.`;
    m.set("s", `s = ${num(sv)} ${wv < 0 ? "-" : "+"} ${num(Math.abs(wv), 1)}i:\\quad e^{st} = e^{${num(sv)} t}\\,e^{${num(wv, 1)}\\,i t}`);
    // Figure 3
    const ok = sig > a + 1e-9;
    read3.textContent = ok
      ? `σ = ${fmt(sig, 2)} is right of a = ${fmt(a, 2)}, so x(t)e^(−σt) dies out and its Fourier transform exists: σ is in the ROC.${a < 0 ? " The ROC also covers σ = 0, so x(t) has an ordinary Fourier transform." : ""}`
      : `σ = ${fmt(sig, 2)} isn't right of a = ${fmt(a, 2)}, so x(t)e^(−σt) doesn't die out and the integral never settles. Slide σ past a.`;
    // Figure 5
    const { P, Z } = full();
    let mx = 0;
    for (let i = 0; i <= 400; i++) mx = Math.max(mx, cabs(rational([0, (7 * i) / 400], P, Z)));
    peak = mx || 1;
    const res = residues(P, Z);
    let hm = 0;
    for (let i = 0; i <= 400; i++) hm = Math.max(hm, Math.abs(impulseS((8 * i) / 400, res)));
    hmax = hm || 1;
    const st = stableS(P);
    read5.textContent = st
      ? `Every pole is left of the iω axis, so h(t) dies out: the system is stable. Its frequency response peaks near ω = ${fmt(peakAt(P, Z), 2)} rad/s.`
      : "A pole is right of the iω axis, so h(t) grows forever: the system is unstable, and the iω axis is outside its ROC, so it has no frequency response.";
    m.set("poles", `\\text{poles: } ${P.map((q) => `${num(q[0])}${q[1] < 0 ? "-" : "+"}${num(Math.abs(q[1]))}i`).join(",\\ ")}${Z.length ? `\\qquad \\text{zeros: } ${Z.map((q) => `${num(q[0])}${q[1] < 0 ? "-" : "+"}${num(Math.abs(q[1]))}i`).join(",\\ ")}` : ""}`);
    for (const p of plots) p.request();
  }
  function peakAt(P, Z) {
    let best = 0, bw = 0;
    for (let i = 0; i <= 700; i++) {
      const w = (7 * i) / 700, v = cabs(rational([0, w], P, Z));
      if (v > best) { best = v; bw = w; }
    }
    return bw;
  }
  update();

  return { destroy() { stopAll(); for (const p of plots) p.destroy(); } };
}
