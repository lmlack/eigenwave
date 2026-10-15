// Lesson 15: the DFT is a change of basis. The Fourier matrix as a grid of
// clock hands; each coefficient X[k] as an inner product with one Fourier
// vector; magnitude and phase; and rebuilding the signal from any subset of
// coefficients, one basis wave at a time.

import { figure } from "../plot.js";
import { button, check, controls, el, fmt, legend, lessonCss, mathPanel, panel, prose, segmented, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { TAU, dft, mulberry32, signedBin } from "../cmath.js";
import { orthogonalityGap, rebuildAt, symmetryGap } from "./dft-math.js";

// On a phone, wide plots get taller and choose their own tick spacing.
const narrow = window.matchMedia("(max-width: 640px)").matches;
const asp = (a) => (narrow ? Math.min(a, 1.8) : a);
const tk = (t) => (narrow ? undefined : t);

const PRESETS = {
  cos1: "Slow cosine",
  mix: "Two waves",
  square: "Square",
  impulse: "Impulse",
  constant: "Constant",
  random: "Random",
};

function preset(key, N, seed = 1) {
  const n = Array.from({ length: N }, (_, i) => i);
  switch (key) {
    case "cos1": return n.map((i) => Math.cos((TAU * i) / N));
    case "mix": return n.map((i) => 0.6 * Math.cos((TAU * 2 * i) / N + 0.6) + 0.5 * Math.sin((TAU * 3 * i) / N) + 0.25);
    case "square": return n.map((i) => (i < N / 2 ? 1 : -1));
    case "impulse": return n.map((i) => (i === 0 ? 1.5 : 0));
    case "constant": return n.map(() => 0.75);
    default: { const r = mulberry32(seed); return n.map(() => Math.round((r() * 3 - 1.5) * 4) / 4); }
  }
}

/** A gap that should be zero: rounding crumbs read as 0. */
const gapText = (g) => (g < 1e-9 ? "0 \\ \\text{(up to rounding)}" : num(g, 3));

export function mount(root) {
  lessonCss("dft");
  const plots = [];
  let N = 8, k = 2, pkey = "mix", seed = 3, pairs = true;
  let x = preset(pkey, N), X = dft(x);
  let keep = new Set([0, 2, N - 2]);
  let lastAdded = 2;
  let gapFF = orthogonalityGap(N);

  root.append(prose(`
    <p>Lesson 5 showed the easy way to find coordinates: in an orthogonal basis, each coefficient is just a dot product with one basis vector. Lesson 14 showed which basis an LTI system likes: the Fourier vectors ${inl("v_k[n] = e^{2\\pi i k n/N}")}. Put those together and you have the <b>DFT</b>, the discrete Fourier transform.</p>
    <p>The DFT takes the ${inl("N")} numbers of a signal and gives back ${inl("N")} new numbers ${inl("X[k]")}: how much of each Fourier wave is in it. It's a change of basis, from impulses to waves. Every coefficient is one inner product, and the waves are orthogonal, so the coefficients don't interfere with each other.</p>`));

  /* ---------- Signal and the selected basis wave ---------- */
  const fx = figure({ x: [-0.6, 7.6], y: [-2, 2], aspect: asp(2.4), xTicks: tk(1), vAxis: false, cap: "The signal x[n]. Drag up and down to edit it. The faint waves are the Fourier vector for the selected k: real part green, imaginary part purple." });
  plots.push(fx.plot);
  fx.plot.draw((p) => {
    if (k !== null) {
      const kk = signedBin(k, N);
      p.fn((t) => Math.cos((TAU * kk * t) / N), { color: p.c.green, width: 1.5, alpha: 0.55, from: 0, to: N - 1 });
      if (k !== 0 && k !== N / 2) p.fn((t) => Math.sin((TAU * kk * t) / N), { color: p.c.purple, width: 1.2, alpha: 0.4, dash: [4, 4], from: 0, to: N - 1 });
    }
    p.stems(x.map((_, i) => i), x, { color: p.c.blue });
  });
  fx.plot.onDrag = (wx, wy) => {
    const i = Math.max(0, Math.min(N - 1, Math.round(wx)));
    x[i] = Math.max(-1.9, Math.min(1.9, Math.round(wy * 4) / 4));
    pSeg.set(null);
    recompute();
  };
  const pSeg = segmented({ label: "Signal", options: Object.entries(PRESETS), value: pkey, onChange: (v) => { pkey = v; seed++; x = preset(v, N, seed); recompute(); } });
  const nSeg = segmented({ label: "Length", options: [[8, "N = 8"], [16, "N = 16"]], value: N, onChange: (v) => {
    N = v; x = preset(pkey ?? "mix", N, seed); k = Math.min(k, N - 1); gapFF = orthogonalityGap(N);
    keep = new Set([0, 2, N - 2]); lastAdded = 2; recompute();
  } });

  /* ---------- Fourier matrix ---------- */
  const fF = figure({ x: [0, 8], y: [0, 8], equal: true, aspect: 1, grid: false, axes: false, cap: `The DFT matrix F, one clock hand per entry ${inl("e^{-2\\pi i kn/N}")}. Row k is the wave that measures frequency k. Tap a row to pick it.` });
  plots.push(fF.plot);
  fF.plot.draw((p) => {
    for (let r = 0; r < N; r++) {
      const y = N - r - 0.5;
      if (r === k) p.rect(0, N - r - 1, N, N - r, { fill: p.c.accent, alpha: 0.13 });
      for (let n = 0; n < N; n++) {
        const a = (-TAU * r * n) / N, cx = n + 0.5;
        p.circle(cx, y, 0.4, { color: p.c.lineStrong, width: 1 });
        p.line(cx, y, cx + 0.36 * Math.cos(a), y + 0.36 * Math.sin(a), { color: r === k ? p.c.accent : p.c.blue, width: N > 8 ? 1.4 : 2 });
      }
    }
  });
  fF.plot.onDrag = (wx, wy) => {
    const r = Math.max(0, Math.min(N - 1, Math.floor(N - wy)));
    if (r !== k) { k = r; render(); }
    void wx;
  };

  /* ---------- Spectrum ---------- */
  const fM = figure({ x: [-0.6, 7.6], y: [0, 6], aspect: asp(2.4), xTicks: tk(1), vAxis: false, cap: "|X[k]|, how much of each wave. Tap a bar to pick k." });
  const fP = figure({ x: [-0.6, 7.6], y: [-Math.PI, Math.PI], aspect: asp(3.2), xTicks: tk(1), vAxis: false,
    yTicks: [[-Math.PI, "−π"], [0, "0"], [Math.PI, "π"]], cap: "The phase of X[k]: how far each wave is shifted. Only drawn where |X[k]| isn't zero." });
  plots.push(fM.plot, fP.plot);
  const ks = () => Array.from({ length: N }, (_, i) => i);
  const mags = () => ks().map((i) => Math.hypot(X.re[i], X.im[i]));
  fM.plot.draw((p) => {
    p.line(N / 2, 0, N / 2, p.vy1, { color: p.c.lineStrong, width: 1, dash: [3, 5] });
    p.text("N/2", N / 2, p.vy1, { color: p.c.fgSubtle, dx: 4, dy: 8, size: 11, weight: 400 });
    const m = mags();
    p.stems(ks(), m, { color: p.c.blue });
    if (k !== null) p.stems([k], [m[k]], { color: p.c.accent, r: 6, width: 3.5 });
  });
  fP.plot.draw((p) => {
    const m = mags(), big = ks().filter((i) => m[i] > 1e-6);
    p.stems(big, big.map((i) => Math.atan2(X.im[i], X.re[i])), { color: p.c.purple });
  });
  const pickK = (wx) => {
    const nk = Math.max(0, Math.min(N - 1, Math.round(wx)));
    if (nk !== k) { k = nk; render(); }
  };
  fM.plot.onDrag = pickK;
  fP.plot.onDrag = pickK;
  const readK = el("p", { class: "small dft-read" });

  root.append(panel("A signal and its coefficients",
    el("div", { class: "dft-pickers" },
      el("div", {}, el("p", { class: "small subtle", text: "Signal" }), pSeg.el),
      el("div", {}, el("p", { class: "small subtle", text: "Length" }), nSeg.el)),
    fx.el,
    el("div", { class: "fig-row" }, fF.el, el("div", {}, fM.el, fP.el)),
    readK));

  /* ---------- Rebuild ---------- */
  root.append(prose(`<p>Going back works the same way in reverse: ${inl("x")} is the sum of the waves, each scaled by its coefficient (and divided by ${inl("N")}). Pick which coefficients to keep and watch the signal come back, one wave at a time. Each ${inl("k")} above ${inl("N/2")} is the same wave as ${inl("N-k")}, turning the other way, so a real signal needs them in pairs.</p>`));
  const chips = el("div", { class: "dft-chips", role: "group", "aria-label": "Coefficients to keep" });
  const fR = figure({ x: [-0.6, 7.6], y: [-2, 2], aspect: asp(2.4), xTicks: tk(1), vAxis: false, cap: "Rings: the original samples. Orange: the signal rebuilt from the kept coefficients, with the smooth curve through it. Dashed green: the wave you added last." });
  plots.push(fR.plot);
  fR.plot.draw((p) => {
    const kp = [...keep];
    x.forEach((v, i) => p.dot(i, v, { r: 6, color: "transparent", stroke: p.c.fgSubtle }));
    if (lastAdded !== null && keep.has(lastAdded)) {
      const one = [lastAdded];
      if (pairs && lastAdded !== 0 && lastAdded !== N / 2) one.push((N - lastAdded) % N);
      p.fn((t) => rebuildAt(X, one, t)[0], { color: p.c.green, width: 1.5, dash: [5, 4], from: 0, to: N - 1 });
    }
    p.fn((t) => rebuildAt(X, kp, t)[0], { color: p.c.accent, width: 1.5, alpha: 0.6, from: 0, to: N - 1 });
    const ys = x.map((_, i) => rebuildAt(X, kp, i)[0]);
    p.stems(x.map((_, i) => i), ys, { color: p.c.accent });
  });
  const pairBox = check({ label: "Keep k and N − k together (so the result stays real)", checked: true, onChange: (v) => { pairs = v; render(); } });
  const allBtn = button("All", () => { keep = new Set(ks()); lastAdded = null; render(); });
  const noneBtn = button("None", () => { keep = new Set(); lastAdded = null; render(); });
  const lowBtn = button("Slowest 3 waves", () => { keep = new Set([0, 1, 2, N - 1, N - 2]); lastAdded = null; render(); });
  const readR = el("p", { class: "small dft-read" });
  root.append(panel("Rebuild the signal from its waves", chips, el("div", { class: "btn-row", style: "margin:10px 0" }, allBtn, noneBtn, lowBtn, pairBox.el), fR.el, readR));

  root.append(tryIt([
    "Tap the rows of the clock grid. Row 0 doesn't turn at all (it measures the average). Row 1 turns once across the row, row 2 twice. Past N/2 the rows turn backwards.",
    "Pick Two waves. Bars light up at k = 0 (the 0.25 offset), at k = 2 and 3 (the two waves), and at their mirror images N − 2 and N − 3. Nothing else.",
    "Pick Impulse. Every bar is the same height: one sharp spike needs every wave in equal amounts.",
    "In the rebuild, press None and add coefficients one at a time. The dashed green wave is what each one adds. With all of them on, the orange sticks land exactly on the rings.",
  ]));

  const m = mathPanel([
    { tex: "X[k] = \\sum_{n=0}^{N-1} x[n]\\, e^{-2\\pi i k n / N} = \\langle x, v_k \\rangle",
      note: "Each coefficient is the inner product of x with one Fourier vector. The minus sign is the conjugate that complex inner products need." },
    { id: "xk", tex: "" },
    { tex: "x[n] = \\frac{1}{N} \\sum_{k=0}^{N-1} X[k]\\, e^{2\\pi i k n / N}",
      note: "The inverse: add up the waves, each scaled by its coefficient." },
    { tex: "X = F x, \\qquad F_{kn} = w^{kn}, \\quad w = e^{-2\\pi i/N}", note: "The DFT is one matrix times the signal. Each entry is a power of w, the clock hand in the grid." },
    { tex: "F^{*} F = N\\, I \\quad\\Rightarrow\\quad F^{-1} = \\tfrac{1}{N} F^{*}",
      note: "The columns are orthogonal and each has length √N, so the inverse is the conjugate transpose over N, with no elimination needed." },
    { id: "ff", tex: "" },
    { tex: "x \\text{ real} \\;\\Rightarrow\\; X[N-k] = \\overline{X[k]}",
      note: "For a real signal the second half of the coefficients mirrors the first: same size, opposite phase." },
    { id: "sym", tex: "" },
  ], [
    ["x[n]", "the signal: N numbers, n = 0 … N − 1"],
    ["X[k]", "the k-th DFT coefficient: how much of wave k is in x"],
    ["N", "the number of samples"],
    ["k", "the frequency: wave k turns k times across the N samples"],
    ["v_k", "the k-th Fourier vector, e^{2πikn/N}"],
    ["\\langle x, v \\rangle", "the complex inner product: multiply by the conjugate of v and add up"],
    ["F", "the DFT matrix"],
    ["w", "e^{−2πi/N}, one step of the clock hand"],
    ["F^{*}", "F conjugated and transposed"],
    ["I", "the identity matrix"],
    ["\\delta_{jl}", "1 when j = l, 0 otherwise: the entries of I"],
    ["j,\\ l", "row and column numbers in F* F"],
    ["\\overline{X}", "the complex conjugate: flip the sign of the imaginary part"],
    ["|X[k]|,\\ \\angle X[k]", "the size and the angle (phase) of a coefficient"],
  ]);
  root.append(m.el);
  root.append(upNext("Fourier series. The same idea for a signal that goes on forever and repeats, built from as many harmonics as you like."));

  function recompute() {
    X = dft(x);
    render();
  }
  function render() {
    const xr = [-0.6, N - 0.4];
    [fx, fM, fP, fR].forEach((f) => f.plot.setRange(xr));
    fF.plot.setRange([0, N], [0, N]);
    const top = Math.max(2, ...mags()) * 1.15;
    fM.plot.setRange(null, [0, top]);
    const rTop = Math.max(2, ...x.map(Math.abs)) * 1.1;
    fR.plot.setRange(null, [-rTop, rTop]);
    fx.plot.setRange(null, [-rTop, rTop]);

    // Rounding leaves 10⁻¹⁶-sized crumbs where the answer is exactly zero.
    const z = (v) => (Math.abs(v) < 1e-9 ? 0 : v);
    const re = z(X.re[k]), im = z(X.im[k]), mag = Math.hypot(re, im), ang = Math.atan2(im, re);
    readK.innerHTML = `k = ${k}: X[${k}] = ${fmt(re, 3)} ${im < 0 ? "−" : "+"} ${fmt(Math.abs(im), 3)}i. Size ${fmt(mag, 3)}${mag > 1e-6 ? `, phase ${fmt((ang * 180) / Math.PI, 1)}°` : ""}. ${k === 0 ? "k = 0 is the plain sum of the samples: N times the average." : k === N / 2 ? "k = N/2 is the fastest wave, +1, −1, +1…" : `It's the mirror of k = ${N - k}.`}`;
    m.set("xk", `X[${k}] = ${x.map((v, n) => `${num(v)}\\,w^{${(k * n) % N}}`).slice(0, 4).join(" + ").replace(/\+ -/g, "- ")} + \\cdots = ${num(re, 3)} ${im < 0 ? "-" : "+"} ${num(Math.abs(im), 3)}\\,i`);
    m.set("ff", `N = ${N}: \\quad \\max_{j,l} \\big| (F^{*}F)_{jl} - N\\,\\delta_{jl} \\big| = ${gapText(gapFF)}`);
    m.set("sym", `\\max_k \\big| X[N-k] - \\overline{X[k]} \\big| = ${gapText(symmetryGap(X))}`);

    chips.replaceChildren(...ks().map((i) => el("button", {
      type: "button", class: `chip${keep.has(i) ? " on" : ""}`, text: `k=${i}`, "aria-pressed": String(keep.has(i)),
      onclick: () => {
        const both = pairs && i !== 0 && i !== N / 2 ? [i, (N - i) % N] : [i];
        const on = !keep.has(i);
        both.forEach((j) => (on ? keep.add(j) : keep.delete(j)));
        lastAdded = on ? i : null;
        k = i;
        render();
      },
    })));
    const kp = [...keep];
    let err = 0, imag = 0;
    x.forEach((v, n) => { const [r2, i2] = rebuildAt(X, kp, n); err = Math.max(err, Math.abs(r2 - v)); imag = Math.max(imag, Math.abs(i2)); });
    readR.textContent = keep.size === 0 ? "Nothing kept: the rebuilt signal is all zeros."
      : `Keeping ${keep.size} of ${N} coefficients. Biggest miss: ${fmt(err, 3)}.${imag > 1e-9 ? ` The result has an imaginary part (up to ${fmt(imag, 3)}) because a k is kept without its partner N − k; only the real part is drawn.` : ""}`;
    plots.forEach((p) => p.request());
  }
  recompute();

  return { destroy() { plots.forEach((p) => p.destroy()); } };
}
