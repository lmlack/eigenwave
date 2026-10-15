// Lesson 19: the FFT. Step an 8-point butterfly diagram stage by stage on a
// real signal, see the even/odd split as a tree, compare N² with N log N, and
// race the plain DFT against the FFT in this browser.

import { animate, figure } from "../plot.js";
import { button, controls, el, fmt, lessonCss, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { dft, fft, mulberry32, signal } from "../cmath.js";
import { dftOps, fftOps, fftStages } from "./fourier-math.js";

const N = 8;
const EXAMPLES = {
  cosine: { name: "Cosine", x: Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * 2 * n) / N)) },
  step: { name: "Step", x: [1, 1, 1, 1, 0, 0, 0, 0] },
  impulse: { name: "Impulse", x: [0, 1, 0, 0, 0, 0, 0, 0] },
  ramp: { name: "Ramp", x: [0, 1, 2, 3, 4, 5, 6, 7] },
};

export function mount(root) {
  const narrow = window.matchMedia("(max-width: 640px)").matches; // phones get taller figures
  lessonCss("fft");
  let ex = "cosine", stage = 0, playing = false, acc = 0;
  let data = fftStages(EXAMPLES[ex].x);

  root.append(prose(`
    <p>The DFT of ${inl("N")} samples takes ${inl("N")} sums of ${inl("N")} terms each: ${inl("N^2")} multiplications. For a million samples that's a trillion. The <b>FFT</b> (fast Fourier transform) gets the exact same answer with about ${inl("\\tfrac{N}{2}\\log_2 N")}: ten million. That speedup is what makes the Fourier transform practical on long signals.</p>
    <p>The FFT splits the samples into the even-numbered ones and the odd-numbered ones. Each half has its own DFT, half as long. Those two half-size answers combine into the full answer with one multiplication per pair. Then split each half again, and again, until every piece is one sample long, and a one-sample DFT is just the sample.</p>`));

  /* ---------- Butterfly diagram ---------- */
  const f1 = figure({ x: [-1.05, 3.75], y: [-0.7, 7.6], aspect: narrow ? 0.8 : 1.25, grid: false, axes: false, cap: "Inputs on the left in bit-reversed order, outputs on the right. Each stage combines pairs: top gets a + W·b, bottom gets a − W·b." });
  const p1 = f1.plot;
  const rowY = (i) => 7 - i;
  const colX = (s) => s;
  p1.draw((p) => {
    const small = p.w < 520;
    const size = small ? 9 : 11;
    // All butterflies, faint; the current stage's, bright.
    data.butterflies.forEach((flies, s) => {
      const live = s + 1 === stage;
      const done = s + 1 <= stage;
      for (const { a, b } of flies) {
        const col = live ? p.c.accent : done ? p.c.lineStrong : p.c.line;
        const w = live ? 2 : 1.2;
        p.line(colX(s), rowY(a), colX(s + 1), rowY(a), { color: col, width: w });
        p.line(colX(s), rowY(b), colX(s + 1), rowY(b), { color: col, width: w });
        p.line(colX(s), rowY(a), colX(s + 1), rowY(b), { color: col, width: w });
        p.line(colX(s), rowY(b), colX(s + 1), rowY(a), { color: col, width: w });
      }
      if (live) {
        for (const { b, k } of flies) p.text(`W${sup(k)}`, colX(s) + 0.5, rowY(b) + 0.22, { align: "center", size: size + 1, color: p.c.purple });
      }
    });
    // Nodes and values.
    for (let s = 0; s <= 3; s++) {
      for (let i = 0; i < N; i++) {
        const known = s <= stage;
        p.dot(colX(s), rowY(i), { r: 4, color: known ? (s === stage ? p.c.accent : p.c.blue) : p.c.line });
        if (known) p.text(cstr(data.stages[s][i], small), colX(s), rowY(i), { dy: -11, align: "center", size, mono: true, weight: 400, color: p.c.fg });
      }
    }
    for (let i = 0; i < N; i++) {
      p.text(`x[${data.order[i]}]`, -0.25, rowY(i), { align: "right", size, color: p.c.fgSubtle });
      if (stage === 3) p.text(`X[${i}]`, 3.2, rowY(i), { size, color: p.c.accent });
    }
    const heads = ["input", "stage 1", "stage 2", "stage 3"];
    for (let s = 0; s <= 3; s++) p.text(heads[s], colX(s), -0.5, { align: "center", size, color: s === stage ? p.c.accent : p.c.fgSubtle });
  });

  /* ---------- The split, as a tree ---------- */
  const f2 = figure({ x: [-0.2, 8.2], y: [-0.4, 3.6], aspect: narrow ? 1.8 : 3.2, grid: false, axes: false, cap: "The even/odd split. Read down to see the splitting, up to see the combining. The highlighted row is what the current stage builds." });
  const p2 = f2.plot;
  p2.draw((p) => {
    for (let level = 0; level <= 3; level++) {
      const size = N >> level; // block size at this level
      const y = 3 - level;
      const blocks = blocksAt(level);
      const lit = 3 - level === stage;
      blocks.forEach((idx, j) => {
        const x0 = j * size + 0.08, x1 = (j + 1) * size - 0.08;
        p.rect(x0, y - 0.32, x1, y + 0.32, { fill: lit ? p.c.accent : p.c.raised, alpha: lit ? 0.22 : 1 });
        idx.forEach((n, t) => p.text(String(n), j * size + t + 0.5, y, { align: "center", size: 12, mono: true, color: lit ? p.c.accent : p.c.fg }));
      });
    }
    p.text("all 8", 0.1, 3.5, { size: 11, color: p.c.fgSubtle, weight: 400 });
  });

  const exSeg = segmented({ label: "Example", options: Object.entries(EXAMPLES).map(([k, v]) => [k, v.name]), value: ex,
    onChange: (v) => { ex = v; data = fftStages(EXAMPLES[v].x); update(); } });
  const back = button("Previous stage", () => { stage = Math.max(0, stage - 1); playing = false; update(); });
  const next = button("Next stage", () => { stage = Math.min(3, stage + 1); playing = false; update(); }, "solid");
  const play = button("Play", () => { playing = !playing; if (playing && stage === 3) stage = 0; acc = 0; update(); anim.kick(); });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  const anim = animate(f1.el, (dt) => {
    acc += dt;
    if (acc > 1.4) { acc = 0; if (stage < 3) stage++; else playing = false; update(); }
  }, () => playing);
  root.append(panel("Eight samples, three stages", f1.el,
    controls(el("div", { class: "ctl" }, el("span", { class: "lbl", text: "Signal" }), exSeg.el)),
    el("div", { class: "btn-row", style: "margin-top:12px" }, back, next, play),
    status, f2.el));

  root.append(tryIt([
    "Press Next stage three times. Each stage only ever combines two numbers at a time, and after three stages (log₂ 8) the right column is the DFT.",
    "Pick “Impulse” (a single 1 at n = 1). The output is the eight powers of W: a single sample turns into one pure complex wave.",
    "Pick “Cosine”: two cycles in 8 samples, so everything cancels except X[2] and X[6], which hold 4 each.",
  ]));

  /* ---------- How much it saves ---------- */
  let logN = 10;
  const f3 = figure({ x: [1, 20], y: [0, 12.5], aspect: narrow ? 1.5 : 2.4, xTicks: [[2, "4"], [5, "32"], [8, "256"], [11, "2k"], [14, "16k"], [17, "131k"], [20, "1M"]],
    yTicks: [[0, "1"], [3, "10³"], [6, "10⁶"], [9, "10⁹"], [12, "10¹²"]], vAxis: false,
    cap: "Multiplications against N, both on log scales. Blue: the plain DFT, N². Green: the FFT, (N/2) log₂ N." });
  const p3 = f3.plot;
  p3.draw((p) => {
    p.fn((u) => Math.log10(dftOps(2 ** u)), { color: p.c.blue, width: 2.5 });
    p.fn((u) => Math.log10(Math.max(1, fftOps(2 ** u))), { color: p.c.green, width: 2.5 });
    const a = Math.log10(dftOps(2 ** logN)), b = Math.log10(Math.max(1, fftOps(2 ** logN)));
    p.line(logN, b, logN, a, { color: p.c.accent, width: 1.5, dash: [4, 4] });
    p.dot(logN, a, { r: 5, color: p.c.blue });
    p.dot(logN, b, { r: 5, color: p.c.green });
    p.text(`${fmt(dftOps(2 ** logN) / fftOps(2 ** logN), 0)}× fewer`, logN, (a + b) / 2, { dx: logN > 15 ? -10 : 10, align: logN > 15 ? "right" : "left", color: p.c.accent });
  });
  const sN = slider({ label: "N", min: 1, max: 20, step: 1, value: logN, format: (v) => (2 ** v).toLocaleString("en-US"), onInput: (v) => { logN = v; update(); } });
  root.append(panel("N² against N log N", f3.el, controls(sN.el)));

  /* ---------- Race ---------- */
  let raceN = 1024;
  const raceSeg = segmented({ label: "Race size", options: [[256, "256"], [1024, "1,024"], [4096, "4,096"]], value: raceN, onChange: (v) => { raceN = v; } });
  const raceOut = el("div", { class: "small", style: "margin-top:12px" });
  const raceBtn = button("Race them", () => race(), "solid");
  function race() {
    raceBtn.disabled = true;
    raceOut.textContent = raceN >= 4096 ? "Running… the plain DFT can take a second at this size." : "Running…";
    setTimeout(() => {
      const rand = mulberry32(raceN);
      const x = signal(raceN, Array.from({ length: raceN }, () => rand() - 0.5));
      let t = performance.now();
      const A = dft(x);
      const tDft = performance.now() - t;
      // The FFT is too quick to time once, so run it many times and average.
      const reps = Math.max(5, Math.round(200000 / raceN));
      t = performance.now();
      let B;
      for (let i = 0; i < reps; i++) B = fft(x);
      const tFft = (performance.now() - t) / reps;
      let err = 0;
      for (let k = 0; k < raceN; k++) err = Math.max(err, Math.hypot(A.re[k] - B.re[k], A.im[k] - B.im[k]));
      raceOut.innerHTML = `
        <div class="race-row"><span>Plain DFT</span><i style="width:100%;background:var(--blue)"></i><b>${fmt(tDft, 1)} ms</b></div>
        <div class="race-row"><span>FFT</span><i style="width:${Math.max(0.5, (100 * tFft) / tDft)}%;background:var(--green)"></i><b>${fmt(tFft, 3)} ms</b></div>
        <p style="margin:8px 0 0">N = ${raceN.toLocaleString("en-US")}: the FFT was about <b>${fmt(tDft / tFft, 0)}× faster</b> in this browser. The two answers agree to within ${err.toExponential(1)}, which is rounding error.</p>`;
      raceBtn.disabled = false;
    }, 30);
  }
  root.append(panel("Race them in your browser",
    prose(`<p>Both run the same JavaScript math on the same random samples. Times depend on your device.</p>`),
    el("div", { class: "btn-row" }, raceSeg.el, raceBtn), raceOut));

  /* ---------- The math ---------- */
  const m = mathPanel([
    { tex: "X[k] = \\sum_{n=0}^{N-1} x[n]\\, W_N^{kn}, \\qquad W_N = e^{-2\\pi i/N}",
      note: `The DFT. ${inl("W_N")} is one Nth of a turn clockwise, and ${inl("W_N^{kn}")} is the turn that sample ${inl("n")} gets at frequency ${inl("k")}.` },
    { tex: "X[k] = \\underbrace{\\sum_{m} x[2m]\\, W_{N/2}^{km}}_{E[k]} + W_N^k \\underbrace{\\sum_{m} x[2m+1]\\, W_{N/2}^{km}}_{O[k]}",
      note: `Split the sum into even and odd samples. Each piece is a DFT of half the length, because ${inl("W_N^2 = W_{N/2}")}.` },
    { tex: "X[k] = E[k] + W_N^k\\, O[k], \\qquad X[k + N/2] = E[k] - W_N^k\\, O[k]",
      note: `One multiplication, ${inl("W_N^k\\, O[k]")}, gives two outputs. That pair is a <b>butterfly</b>.` },
    { id: "stage", tex: "" },
    { tex: "C(N) = 2\\,C(N/2) + \\tfrac{N}{2} \\;\\Longrightarrow\\; C(N) = \\tfrac{N}{2} \\log_2 N",
      note: "Two half-size problems plus N/2 butterflies, at every one of the log₂ N levels." },
    { id: "ops", tex: "" },
  ], [
    ["x[n]", "the input samples"],
    ["X[k]", "the DFT: the amount of frequency k"],
    ["N", "how many samples (a power of two here)"],
    ["W_N", "one Nth of a turn clockwise, the twiddle factor"],
    ["W_N^k", "that turn taken k times"],
    ["E[k],\\ O[k]", "the DFTs of the even-numbered and odd-numbered samples"],
    ["m", "counts through each half: sample 2m or 2m + 1"],
    ["C(N)", "how many multiplications an N-point FFT needs"],
    ["\\log_2 N", "how many times N halves before reaching 1: the number of stages"],
  ]);
  root.append(m.el);
  root.append(upNext("convolution becomes multiplication: with the FFT, filtering a signal turns into multiplying two spectra."));

  function update() {
    play.textContent = playing ? "Pause" : "Play";
    back.disabled = stage === 0;
    next.disabled = stage === 3;
    status.textContent = stage === 0
      ? "Stage 0: the samples, reordered so each pair to combine sits side by side. A one-sample DFT is the sample itself."
      : stage === 3
        ? "Stage 3: done. The right column is the 8-point DFT, after 12 butterflies (4 per stage)."
        : `Stage ${stage}: combine ${2 ** (stage - 1)}-point DFTs in pairs into ${2 ** stage}-point DFTs. 4 butterflies.`;
    const twiddles = stage ? [...new Set(data.butterflies[stage - 1].map((f) => f.k))].map((k) => `W_8^{${k}}`).join(",\\ ") : "";
    m.set("stage", stage
      ? `\\text{stage ${stage}: } ${2 ** stage}\\text{-point DFTs, twiddles } ${twiddles}`
      : "\\text{stage 0: inputs in bit-reversed order}");
    const n = 2 ** logN;
    m.set("ops", `N = ${n.toLocaleString("en-US").replace(/,/g, "{,}")}:\\quad N^2 = ${num(dftOps(n), 2)},\\quad \\tfrac{N}{2}\\log_2 N = ${num(fftOps(n), 2)}`);
    p1.request(); p2.request(); p3.request();
  }
  update();

  return { destroy() { anim.stop(); p1.destroy(); p2.destroy(); p3.destroy(); } };
}

/** The index blocks at each level of the even/odd split. */
function blocksAt(level) {
  let blocks = [[0, 1, 2, 3, 4, 5, 6, 7]];
  for (let l = 0; l < level; l++) {
    blocks = blocks.flatMap((b) => [b.filter((_, i) => i % 2 === 0), b.filter((_, i) => i % 2 === 1)]);
  }
  return blocks;
}

/** A complex value as short text: "2", "−1.4i", "0.7+0.7i". */
function cstr([re, im], short) {
  const d = short ? 1 : 2;
  const r = Math.abs(re) < 5e-3 ? 0 : re, i = Math.abs(im) < 5e-3 ? 0 : im;
  const f = (v) => fmt(v, Number.isInteger(Math.round(v * 100) / 100) ? 0 : d).replace("-", "−");
  if (!i) return f(r);
  if (!r) return `${f(i)}i`;
  return `${f(r)}${i < 0 ? "−" : "+"}${f(Math.abs(i))}i`;
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (k) => String(k).split("").map((c) => SUP[+c]).join("");
