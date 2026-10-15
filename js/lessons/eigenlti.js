// Lesson 14: why sines. An LTI system on N samples (wrapping around) is a
// circulant matrix. Feed it a Fourier vector and the same wave comes out,
// scaled and shifted: an eigenvector. Its eigenvalue is H[k], the DFT of h.
// Then a continuous sinusoid through a moving average: same frequency out.

import { animate, figure } from "../plot.js";
import { check, controls, el, fmt, legend, lessonCss, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { TAU, circulant, dft, matVec, mulberry32 } from "../cmath.js";
import { fourierVector, movingAverageGain, movingAverageOfSine, padTo } from "./eigenlti-math.js";

// On a phone, wide plots get taller and choose their own tick spacing.
const narrow = window.matchMedia("(max-width: 640px)").matches;
const asp = (a) => (narrow ? Math.min(a, 1.8) : a);
const tk = (t) => (narrow ? undefined : t);

const H_PRESETS = {
  average: ["Average of 3", [1 / 3, 1 / 3, 1 / 3]],
  smooth: ["Smooth", [0.25, 0.5, 0.25]],
  echo: ["Echo", [1, 0, 0, 0.6]],
  diff: ["Difference", [1, -1]],
};

export function mount(root) {
  lessonCss("eigenlti");
  const plots = [];
  let N = 8, hKey = "average", k = 1, mode = "wave", seed = 2;
  let h, A, H, vin, vout, rnd;

  root.append(prose(`
    <p>Convolution can reshape a signal completely. But some inputs come out of <i>every</i> LTI system with their shape untouched: only bigger or smaller, and shifted along. Those are the complex exponentials ${inl("e^{i\\omega n}")}, and their real parts, sines and cosines. That's the whole reason Fourier analysis uses waves.</p>
    <p>To see it with a matrix, wrap the signal around: sample ${inl("N")} comes right after sample ${inl("N-1")} again. Then convolution with ${inl("h")} is a <b>circulant</b> matrix: each column is the one before it, rotated down by one. Lesson 6 called a vector that a matrix only stretches an <b>eigenvector</b>. The Fourier vectors are eigenvectors of every circulant matrix, all at once.</p>`));

  /* ---------- Controls ---------- */
  const nSeg = segmented({ label: "Length", options: [[8, "N = 8"], [16, "N = 16"]], value: N, onChange: (v) => { N = v; k = Math.min(k, N - 1); sK.el.querySelector("input").max = N - 1; sK.set(k); rebuild(); } });
  const hSeg = segmented({ label: "System", options: Object.entries(H_PRESETS).map(([key, [t]]) => [key, t]), value: hKey, onChange: (v) => { hKey = v; rebuild(); } });
  const mSeg = segmented({ label: "Input", options: [["wave", "Fourier vector"], ["random", "Random input"]], value: mode, onChange: (v) => { mode = v; if (v === "random") seed++; rebuild(); } });
  const sK = slider({ label: "Frequency k", min: 0, max: N - 1, step: 1, value: k, format: (v) => String(v), onInput: (v) => { k = v; rebuild(); } });

  /* ---------- Input and output ---------- */
  const fIn = figure({ x: [-0.6, 15.6], y: [-1.6, 1.6], aspect: asp(2.6), xTicks: tk(1), vAxis: false, cap: "The input. Real part blue, imaginary part purple." });
  const fOut = figure({ x: [-0.6, 15.6], y: [-1.6, 1.6], aspect: asp(2.6), xTicks: tk(1), vAxis: false, cap: "The output A x. Rings: the input times λ. When they sit on the sticks, the input was an eigenvector." });
  plots.push(fIn.plot, fOut.plot);
  const ns = () => Array.from({ length: N }, (_, n) => n);
  fIn.plot.draw((p) => {
    if (mode === "wave") p.stems(ns().map((n) => n + 0.12), vin[1], { color: p.c.purple, alpha: 0.6, r: 3 });
    p.stems(ns().map((n) => n - 0.12), vin[0], { color: p.c.blue });
  });
  fOut.plot.draw((p) => {
    if (mode === "wave") p.stems(ns().map((n) => n + 0.12), vout[1], { color: p.c.purple, alpha: 0.6, r: 3 });
    p.stems(ns().map((n) => n - 0.12), vout[0], { color: p.c.blue });
    // λ times the input, as rings on top.
    const lr = H.re[k], li = H.im[k];
    ns().forEach((n) => {
      const re = mode === "wave" ? lr * vin[0][n] - li * vin[1][n] : lr * vin[0][n];
      p.dot(n - 0.12, re, { r: 6, color: "transparent", stroke: p.c.accent });
    });
  });
  const verdictIO = el("p", { class: "small eig-verdict" });

  /* ---------- Complex plane ---------- */
  const fZ = figure({ x: [-1.5, 1.5], y: [-1.5, 1.5], equal: true, aspect: 1, xTicks: tk(0.5), yTicks: 0.5, cap: "Each sample as a point in the complex plane: input in blue, output in orange. Every point gets the same turn and the same scaling." });
  plots.push(fZ.plot);
  fZ.plot.draw((p) => {
    p.circle(0, 0, 1, { color: p.c.lineStrong, width: 1, dash: [4, 4] });
    const mag = Math.hypot(H.re[k], H.im[k]);
    if (mag > 0.02) p.circle(0, 0, mag, { color: p.c.accent, width: 1, dash: [2, 4] });
    ns().forEach((n) => {
      const a = [vin[0][n], vin[1][n]], b = [vout[0][n], vout[1][n]];
      p.line(a[0], a[1], b[0], b[1], { color: p.c.fgSubtle, width: 1, alpha: 0.5 });
      p.dot(a[0], a[1], { r: 4, color: p.c.blue });
      p.dot(b[0], b[1], { r: 4, color: p.c.accent });
    });
    p.arrow(0, 0, vin[0][1 % N], vin[1][1 % N], { color: p.c.blue, width: 1.5 });
    p.arrow(0, 0, vout[0][1 % N], vout[1][1 % N], { color: p.c.accent, width: 1.5 });
  });

  /* ---------- Frequency response ---------- */
  const fH = figure({ x: [-0.6, 15.6], y: [0, 1.6], aspect: asp(2.2), xTicks: tk(1), vAxis: false, cap: "|H[k]|, the eigenvalue sizes, for every k. The faint curve is the same thing between the whole-number k. Drag across it to pick k." });
  plots.push(fH.plot);
  fH.plot.draw((p) => {
    const taps = H_PRESETS[hKey][1];
    p.fn((x) => {
      const w = (TAU * x) / N;
      let re = 0, im = 0;
      taps.forEach((t, n) => { re += t * Math.cos(w * n); im -= t * Math.sin(w * n); });
      return Math.hypot(re, im);
    }, { color: p.c.green, width: 1.2, alpha: 0.5, from: 0, to: N - 1 });
    const mags = ns().map((i) => Math.hypot(H.re[i], H.im[i]));
    p.stems(ns(), mags, { color: p.c.green });
    p.stems([k], [mags[k]], { color: p.c.accent, r: 6, width: 3 });
  });
  fH.plot.onDrag = (wx) => {
    const nk = Math.max(0, Math.min(N - 1, Math.round(wx)));
    if (nk !== k) { k = nk; sK.set(k); if (mode !== "wave") { mode = "wave"; mSeg.set("wave"); } rebuild(); }
  };

  /* ---------- The matrix ---------- */
  const matEl = el("div", { class: "eig-matrix" });

  root.append(panel("Put a wave through the system",
    el("div", { class: "eig-pickers" },
      el("div", {}, el("p", { class: "small subtle", text: "System h" }), hSeg.el),
      el("div", {}, el("p", { class: "small subtle", text: "Input" }), mSeg.el),
      el("div", {}, el("p", { class: "small subtle", text: "Length" }), nSeg.el)),
    controls(sK.el),
    fIn.el, fOut.el,
    legend([["--blue", "real part"], ["--purple", "imaginary part"], ["--accent", "λ times the input"]]),
    verdictIO));
  root.append(panel("The same thing in the complex plane, and for every k",
    el("div", { class: "fig-row" }, fZ.el, el("div", {}, fH.el, matEl))));

  root.append(tryIt([
    "With a Fourier vector in, move k. The rings always sit on the output sticks: the wave comes out the same wave, just scaled and shifted.",
    "Switch to Random input. Now the rings miss: a random signal gets reshaped, not just scaled.",
    "Pick Average of 3 and look at |H[k]|. Slow waves (low k) pass almost untouched. Near k = N/3 the output nearly vanishes: three neighboring samples of that wave almost cancel.",
    "Pick Difference. k = 0, a constant, comes out as zero: a constant has no differences. The fastest wave, k = N/2, doubles.",
  ]));

  /* ---------- Continuous version ---------- */
  root.append(prose(`<p>The same thing happens with smooth signals in continuous time. Below, a sine wave goes through a moving average that looks back ${inl("W")} seconds. Whatever the frequency, what comes out is a sine of the <i>same</i> frequency: smaller, and half a window late. Only the size and the delay depend on the frequency.</p>`));
  const W = 0.4;
  let f = 1, t0 = 0, playing = true;
  const fC = figure({ x: [0, 4], y: [-1.3, 1.3], aspect: asp(2.6), xTicks: tk(0.5), xLabel: "t (s)", cap: `Input sin(2πft) in blue, the ${W} s moving average in orange.` });
  plots.push(fC.plot);
  fC.plot.draw((p) => {
    p.fn((t) => Math.sin(TAU * f * (t + t0)), { color: p.c.blue, width: 2 });
    p.fn((t) => movingAverageOfSine(t + t0, f, W), { color: p.c.accent, width: 2.5 });
    p.rect(3.6 - W, -1.3, 3.6, 1.3, { fill: p.c.accent, alpha: 0.08 });
  });
  const sF = slider({ label: "Frequency f", min: 0.1, max: 6, step: 0.05, value: f, format: (v) => `${fmt(v, 2)} Hz`, onInput: (v) => { f = v; updateC(); } });
  const playC = check({ label: "Play", checked: true, onChange: (v) => { playing = v; if (v) animC.kick(); } });
  const readC = el("p", { class: "small eig-verdict" });
  root.append(panel("A sine through a moving average", fC.el, legend([["--blue", "input"], ["--accent", "output"]]), controls(sF.el, playC.el), readC));
  const animC = animate(fC.el, (dt) => { t0 += dt * 0.5; fC.plot.request(); }, () => playing);

  const m = mathPanel([
    { tex: "A = \\begin{bmatrix} h_0 & h_{N-1} & \\cdots & h_1 \\\\ h_1 & h_0 & \\cdots & h_2 \\\\ \\vdots & & \\ddots & \\vdots \\\\ h_{N-1} & h_{N-2} & \\cdots & h_0 \\end{bmatrix}, \\qquad (A x)[n] = \\sum_{m} h[(n - m) \\bmod N]\\, x[m]",
      note: "Circular convolution with h is multiplication by the circulant matrix A." },
    { tex: "v_k[n] = e^{2\\pi i k n / N}, \\qquad A\\,v_k = \\lambda_k\\, v_k",
      note: "The k-th Fourier vector is an eigenvector of A." },
    { tex: "\\lambda_k = \\sum_{n=0}^{N-1} h[n]\\, e^{-2\\pi i k n / N} = H[k]",
      note: "Its eigenvalue is the DFT of h at k. That's the frequency response: how much the system scales and turns frequency k." },
    { id: "lam", tex: "" },
    { id: "err", tex: "" },
    { tex: "A = F^{-1}\\, \\Lambda\\, F, \\qquad \\Lambda = \\operatorname{diag}(H[0], \\dots, H[N-1])",
      note: "So every circulant matrix is diagonalized by the same matrix F, the DFT. Change to the Fourier basis and convolution becomes multiplying each coefficient by a number." },
    { tex: "\\sin(2\\pi f t) \\;\\to\\; G(f)\\,\\sin\\big(2\\pi f (t - \\tfrac{W}{2})\\big), \\qquad G(f) = \\frac{\\sin(\\pi f W)}{\\pi f W}",
      note: "The continuous moving average: same frequency, scaled by G(f), delayed by W/2." },
    { id: "cont", tex: "" },
  ], [
    ["A", "the circulant matrix: the system acting on N samples that wrap around"],
    ["h[n]", "the impulse response (the first column of A)"],
    ["N", "the number of samples"],
    ["n,\\ m", "sample numbers"],
    ["k", "the frequency: k full turns across the N samples"],
    ["v_k", "the k-th Fourier vector"],
    ["\\lambda_k", "its eigenvalue: the number A multiplies v_k by"],
    ["H[k]", "the DFT of h, also called the frequency response"],
    ["F,\\ \\Lambda", "the DFT matrix, and the diagonal matrix of eigenvalues"],
    ["f,\\ t", "frequency in hertz and time in seconds"],
    ["W", "the moving-average window, in seconds"],
    ["G(f)", "how much the moving average scales a sine of frequency f"],
  ]);
  root.append(m.el);
  root.append(upNext("the DFT itself. If waves are the natural basis for LTI systems, how do you find how much of each wave is in a signal?"));

  function rebuild() {
    h = padTo(H_PRESETS[hKey][1], N);
    A = circulant(h);
    H = dft(h);
    if (mode === "wave") vin = fourierVector(k, N);
    else {
      const r = mulberry32(seed);
      vin = [Array.from({ length: N }, () => Math.round((r() * 2 - 1) * 4) / 4), new Array(N).fill(0)];
    }
    vout = [matVec(A, vin[0]), matVec(A, vin[1])];
    const xr = [-0.6, N - 0.4];
    fIn.plot.setRange(xr); fOut.plot.setRange(xr); fH.plot.setRange(xr);
    const top = Math.max(1.2, ...vout[0].map(Math.abs), ...vout[1].map(Math.abs)) * 1.2;
    fOut.plot.setRange(null, [-top, top]);
    const hmax = Math.max(1.2, ...Array.from(H.re, (r, i) => Math.hypot(r, H.im[i]))) * 1.15;
    fH.plot.setRange(null, [0, hmax]);
    const lam = [H.re[k], H.im[k]];
    const mag = Math.hypot(...lam), ang = (Math.atan2(lam[1], lam[0]) * 180) / Math.PI;
    let err = 0;
    for (let n = 0; n < N; n++) {
      const er = mode === "wave" ? lam[0] * vin[0][n] - lam[1] * vin[1][n] : lam[0] * vin[0][n];
      const ei = mode === "wave" ? lam[0] * vin[1][n] + lam[1] * vin[0][n] : 0;
      err = Math.max(err, Math.hypot(vout[0][n] - er, vout[1][n] - ei));
    }
    verdictIO.innerHTML = mode === "wave"
      ? `Same wave out. It's ${fmt(mag, 3)} times as big and turned by ${fmt(ang, 1)}°, which shows up as a shift along n. That's λ = H[${k}].`
      : `A random input comes out a different shape: the rings (λ times the input, for k = ${k}) don't match. Only the Fourier vectors keep their shape.`;
    m.set("lam", `\\lambda_{${k}} = H[${k}] = ${num(lam[0], 3)} ${lam[1] < 0 ? "-" : "+"} ${num(Math.abs(lam[1]), 3)}\\,i = ${num(mag, 3)}\\, e^{i\\,${num(ang, 1)}^\\circ}`);
    m.set("err", mode === "wave" ? `\\max_n \\big| (A v_{${k}})[n] - \\lambda_{${k}} v_{${k}}[n] \\big| = ${err < 1e-9 ? "0" : num(err, 3)}` : `\\max_n \\big| (A x)[n] - \\lambda_{${k}} x[n] \\big| = ${num(err, 3)} \\;\\ne 0`);
    drawMatrix();
    plots.forEach((p) => p.request());
  }
  function drawMatrix() {
    const cell = (v) => {
      const a = Math.min(1, Math.abs(v));
      const tint = v >= 0 ? "var(--green)" : "var(--accent)";
      return `<td style="background:color-mix(in oklab, ${tint} ${Math.round(a * 55)}%, transparent)"></td>`;
    };
    matEl.innerHTML = `<p class="small subtle">The circulant matrix A, shaded by value. Every column is h, rotated down one more.</p><table class="n${N}">${A.map((r) => `<tr>${r.map(cell).join("")}</tr>`).join("")}</table>`;
  }
  function updateC() {
    const g = movingAverageGain(f, W);
    readC.innerHTML = `At ${fmt(f, 2)} Hz the output is ${fmt(Math.abs(g), 3)} times the input${g < 0 ? " and flipped" : ""}, ${W / 2} s late. Same frequency.${Math.abs(g) < 0.02 ? " Here the window holds whole cycles, so they average out to almost nothing." : ""}`;
    m.set("cont", `G(${num(f)}) = \\frac{\\sin(\\pi \\cdot ${num(f)} \\cdot ${W})}{\\pi \\cdot ${num(f)} \\cdot ${W}} = ${num(g, 3)}`);
    fC.plot.request();
  }
  rebuild();
  updateC();

  return { destroy() { plots.forEach((p) => p.destroy()); animC.stop(); } };
}
