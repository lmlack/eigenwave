// Lesson 13: convolution. Three views of the same sum: flip h and slide it
// past x; add up shifted, scaled copies of h; and multiply x by a matrix
// whose rows are flipped copies of h.

import { animate, figure } from "../plot.js";
import { button, controls, el, fmt, legend, lessonCss, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { convolve } from "../cmath.js";
import { convMatrix, terms } from "./convolution-math.js";

// On a phone, wide plots get taller and choose their own tick spacing.
const narrow = window.matchMedia("(max-width: 640px)").matches;
const asp = (a) => (narrow ? Math.min(a, 1.8) : a);
const tk = (t) => (narrow ? undefined : t);

const NX = 8, NH = 5, NY = NX + NH - 1;
const X_PRESETS = {
  pulse: ["Pulse", [1, 1, 1, 1, 0, 0, 0, 0]],
  spikes: ["Two spikes", [1, 0, 0, 0, 0, -0.5, 0, 0]],
  ramp: ["Ramp", [0.25, 0.5, 0.75, 1, 1.25, 0, 0, 0]],
  mixed: ["Mixed", [1, -0.5, 1.5, 0, 0.5, 1, -1, 0.5]],
};
const H_PRESETS = {
  decay: ["Decay", [1, 0.7, 0.49, 0.34, 0.24]],
  average: ["Average of 3", [1 / 3, 1 / 3, 1 / 3, 0, 0]],
  diff: ["Difference", [1, -1, 0, 0, 0]],
  echo: ["Echo", [1, 0, 0, 0.6, 0]],
};

export function mount(root) {
  lessonCss("convolution");
  const plots = [];
  let x = [...X_PRESETS.pulse[1]], h = [...H_PRESETS.decay[1]];
  let y = Array.from(convolve(x, h));
  let n = 3, playing = false, tAcc = 0, K = 2;

  root.append(prose(`
    <p>Last lesson ended with LTI systems: linear and time-invariant. Here's why they're special. Feed one in a single impulse ${inl("\\delta[n]")} and call what comes out ${inl("h[n]")}, the <b>impulse response</b>. That one signal tells you what the system does to <i>any</i> input.</p>
    <p>The reason is the first lesson's idea. Any input is a combination of shifted impulses: ${inl("x = \\sum_k x[k]\\,\\delta[n-k]")}. Time-invariant means a shifted impulse gives a shifted ${inl("h")}. Linear means a combination of inputs gives the same combination of outputs. Put those together and the output is a combination of shifted copies of ${inl("h")}:</p>`));
  root.append(el("div", { class: "conv-eq", html: inl("y[n] = \\sum_k x[k]\\, h[n-k]") }));
  root.append(prose(`<p>That sum is <b>convolution</b>, written ${inl("y = x * h")}. Below are three ways to watch it happen. Drag up and down on the x and h plots to draw your own.</p>`));

  /* ---------- Inputs ---------- */
  const fx = figure({ x: [-0.6, NX - 0.4], y: [-2, 2], aspect: 1.8, xTicks: tk(1), vAxis: false, cap: "x[k], the input. Drag to edit." });
  const fh = figure({ x: [-0.6, NH - 0.4], y: [-2, 2], aspect: 1.8, xTicks: tk(1), vAxis: false, cap: "h[k], the impulse response. Drag to edit." });
  plots.push(fx.plot, fh.plot);
  fx.plot.draw((p) => p.stems(x.map((_, i) => i), x, { color: p.c.blue }));
  fh.plot.draw((p) => p.stems(h.map((_, i) => i), h, { color: p.c.green }));
  const edit = (arr, len) => (wx, wy) => {
    const i = Math.max(0, Math.min(len - 1, Math.round(wx)));
    arr[i] = Math.max(-1.9, Math.min(1.9, Math.round(wy * 4) / 4));
    xSeg.set(null); hSeg.set(null);
    update();
  };
  fx.plot.onDrag = edit(x, NX);
  fh.plot.onDrag = edit(h, NH);
  const xSeg = segmented({ label: "Input", options: Object.entries(X_PRESETS).map(([k, [t]]) => [k, t]), value: "pulse",
    onChange: (k) => { x.splice(0, NX, ...X_PRESETS[k][1]); update(); } });
  const hSeg = segmented({ label: "Impulse response", options: Object.entries(H_PRESETS).map(([k, [t]]) => [k, t]), value: "decay",
    onChange: (k) => { h.splice(0, NH, ...H_PRESETS[k][1]); update(); } });
  root.append(panel("The input and the impulse response",
    el("div", { class: "fig-row" }, fx.el, fh.el),
    el("div", { class: "conv-presets" },
      el("div", {}, el("p", { class: "small subtle", text: "Input x" }), xSeg.el),
      el("div", {}, el("p", { class: "small subtle", text: "Impulse response h" }), hSeg.el))));

  /* ---------- View 1: flip and slide ---------- */
  const KX = [-5.6, NY - 0.4];
  const f1 = figure({ x: KX, y: [-2, 2], aspect: asp(3), xTicks: tk(1), vAxis: false, cap: "x[k] in blue, and h[n − k] in green: h flipped around and slid so its start sits at k = n." });
  const f2 = figure({ x: KX, y: [-2, 2], aspect: asp(3), xTicks: tk(1), vAxis: false, cap: "Their product x[k]·h[n − k], sample by sample. Add these up to get y[n]." });
  const f3 = figure({ x: KX, y: [-3, 3], aspect: asp(3), xTicks: tk(1), vAxis: false, cap: "y = x * h. Solid up to the current n, faint after it." });
  plots.push(f1.plot, f2.plot, f3.plot);
  const ks = Array.from({ length: NY + 5 }, (_, i) => i - 5);
  const hAt = (i) => (i >= 0 && i < NH ? h[i] : 0);
  f1.plot.draw((p) => {
    p.stems(x.map((_, i) => i - 0.1), x, { color: p.c.blue });
    p.stems(ks.map((k) => k + 0.1), ks.map((k) => hAt(n - k)), { color: p.c.green });
    marker(p, 2);
  });
  f2.plot.draw((p) => {
    const t = terms(x, h, n);
    p.stems(t.map((_, i) => i), t, { color: p.c.accent });
    marker(p, 2);
  });
  f3.plot.draw((p) => {
    const ns = y.map((_, i) => i);
    p.stems(ns.filter((i) => i > n), y.filter((_, i) => i > n), { color: p.c.blue, alpha: 0.25 });
    p.stems(ns.filter((i) => i <= n), y.filter((_, i) => i <= n), { color: p.c.blue });
    if (n >= 0 && n < NY) p.dot(n, y[n], { r: 7, color: "transparent", stroke: p.c.accent });
    marker(p, 3);
  });
  function marker(p, top) {
    p.line(n, -top, n, top, { color: p.c.accent, width: 1.2, dash: [4, 4], alpha: 0.7 });
  }
  const sN = slider({ label: "n", min: -2, max: NY, step: 1, value: n, format: (v) => String(v), onInput: (v) => { n = v; playing = false; playBtn.textContent = "Play"; update(); } });
  const playBtn = button("Play", () => {
    playing = !playing;
    playBtn.textContent = playing ? "Pause" : "Play";
    if (playing) { if (n >= NY) n = -2; anim.kick(); }
  }, "solid");
  const read1 = el("p", { class: "small conv-read" });
  root.append(panel("View 1: flip and slide", f1.el, f2.el, f3.el,
    controls(sN.el, el("div", { class: "btn-row" }, playBtn)), read1));
  const anim = animate(f1.el, (dt) => {
    tAcc += dt;
    if (tAcc < 0.7) return;
    tAcc = 0;
    n = n >= NY ? -2 : n + 1;
    sN.set(n);
    update();
  }, () => playing);

  /* ---------- View 2: copies of h ---------- */
  // Each copy x[k]·h[n − k] is its own colored block, stacked at every n, so
  // the output visibly builds up copy by copy. Positive parts stack up from
  // zero, negative parts stack down. The newest copy is outlined.
  const fS = figure({ x: [-0.6, NY - 0.4], y: [-3, 3], aspect: asp(2.6), xTicks: tk(1), vAxis: false,
    cap: "Each colored block is one copy of h, scaled by x[k] and started at n = k. Stacked, they add up to y. The newest copy is outlined; the rings are the final y." });
  plots.push(fS.plot);
  const copyColor = (c, k) => [c.blue, c.green, c.purple, c.gold][k % 4];
  fS.plot.draw((p) => {
    const W = 0.62;
    for (let m = 0; m < NY; m++) {
      let up = 0, down = 0;
      for (let k = 0; k < K; k++) {
        const v = x[k] * hAt(m - k);
        if (Math.abs(v) < 1e-9) continue;
        const base = v > 0 ? up : down;
        const newest = k === K - 1;
        p.rect(m - W / 2, base, m + W / 2, base + v, { fill: copyColor(p.c, k), alpha: newest ? 0.95 : 0.55 });
        if (newest) p.path([[m - W / 2, base], [m + W / 2, base], [m + W / 2, base + v], [m - W / 2, base + v]], { color: p.c.accent, width: 2.5, close: true });
        if (v > 0) up += v; else down += v;
      }
    }
    for (let m = 0; m < NY; m++) p.dot(m, y[m], { r: 6, color: "transparent", stroke: p.c.fgSubtle });
  });
  const sK = slider({ label: "Copies added", min: 0, max: NX, step: 1, value: K, format: (v) => `${v} of ${NX}`, onInput: (v) => { stopCopies(); K = v; update(); } });
  // Play adds one copy every 0.8 s, starting over from none.
  let copyTimer = 0;
  const playCopies = button("Add copies one by one", () => {
    if (copyTimer) { stopCopies(); return; }
    K = 0; sK.set(0); update();
    playCopies.textContent = "Stop";
    copyTimer = setInterval(() => {
      K += 1; sK.set(K); update();
      if (K >= NX) stopCopies();
    }, 800);
  });
  function stopCopies() {
    if (copyTimer) clearInterval(copyTimer);
    copyTimer = 0;
    playCopies.textContent = "Add copies one by one";
  }
  const read2 = el("p", { class: "small conv-read" });
  root.append(panel("View 2: a sum of shifted copies of h", prose(`<p>Turn the sum around: each input sample ${inl("x[k]")} starts its own copy of ${inl("h")}, scaled by ${inl("x[k]")} and starting at ${inl("k")}. The output is all those copies added up. This is superposition, straight from linearity.</p>`),
    fS.el, controls(sK.el, playCopies), read2));

  /* ---------- View 3: a matrix ---------- */
  const mat = el("div", { class: "conv-matrix" });
  root.append(panel("View 3: convolution is a matrix", prose(`<p>Since convolution is linear, it's a matrix times a vector, ${inl("y = T x")}. Row ${inl("n")} of ${inl("T")} is ${inl("h")} flipped and slid to ${inl("n")}: exactly the green sticks in view 1. Each column is ${inl("h")} moved down by one more row, so every diagonal is constant. A matrix like that is called <b>Toeplitz</b>. The highlighted row is the current ${inl("n")} from view 1.</p>`), mat));

  root.append(tryIt([
    "Press Play and watch the green h slide across x. y[n] is the area of overlap in the middle plot, one n at a time.",
    "Pick x = Two spikes. The output is just two copies of h, one flipped upside down and half the size. That's view 2 in its simplest form.",
    "Pick h = Average of 3 with x = Pulse. The sharp edges of the pulse come out as ramps: averaging smooths.",
    "Pick h = Difference. The output is only nonzero where x changes. Convolution with [1, −1] finds edges.",
  ]));

  const m = mathPanel([
    { tex: "x[n] = \\sum_k x[k]\\,\\delta[n-k] \\;\\xrightarrow{\\;T\\;}\\; y[n] = \\sum_k x[k]\\,h[n-k]",
      note: "Write x as shifted impulses. Each δ[n − k] becomes h[n − k] (time-invariant), and the weights x[k] carry through (linear)." },
    { tex: "y = x * h, \\qquad y[n] = \\sum_k x[k]\\,h[n-k] = \\sum_k h[k]\\,x[n-k]", note: "Convolution. Swapping the roles of x and h gives the same answer." },
    { id: "yn", tex: "" },
    { tex: "y = T\\,x, \\qquad T_{nk} = h[n-k]", note: `Length ${NX} in, length ${NH} impulse response, length ${NX} + ${NH} − 1 = ${NY} out.` },
  ], [
    ["x[k]", "the input at sample k"],
    ["h[n]", "the impulse response: the output when the input is a single δ[n]"],
    ["y[n]", "the output at sample n"],
    ["\\delta[n-k]", "a unit impulse moved to sample k"],
    ["k", "the counting variable in the sum: which input sample"],
    ["*", "convolution (not multiplication)"],
    ["T", "the convolution matrix; T_{nk} is its entry in row n, column k"],
  ]);
  root.append(m.el);
  root.append(upNext("why sines and cosines. Some inputs come out of every LTI system unchanged in shape, and they're the waves Fourier is built on."));

  function update() {
    y = Array.from(convolve(x, h));
    const top = Math.max(2, ...y.map(Math.abs)) * 1.15;
    f3.plot.setRange(null, [-top, top]);
    fS.plot.setRange(null, [-top, top]);
    const t = terms(x, h, n);
    const used = t.map((v, k) => [v, k]).filter(([, k]) => n - k >= 0 && n - k < NH);
    const yn = n >= 0 && n < NY ? y[n] : 0;
    read1.innerHTML = n < 0 || n >= NY
      ? `At n = ${n}, h[n − k] doesn't overlap x at all, so y[${n}] = 0.`
      : `y[${n}] = ${used.map(([v]) => fmt(v, 2)).join(" + ").replace(/\+ -/g, "− ")} = <b>${fmt(yn, 2)}</b>`;
    m.set("yn", n < 0 || n >= NY ? `y[${n}] = 0`
      : `y[${n}] = ${used.map(([, k]) => `x[${k}]\\,h[${n - k}]`).join(" + ")} = ${num(yn)}`);
    const xk = K > 0 ? x[K - 1] : 0;
    read2.textContent = K === 0
      ? "No copies yet: the sum is zero. Slide right or press the button to add them."
      : Math.abs(xk) < 1e-9
        ? `Copy ${K}: x[${K - 1}] is 0, so this copy is all zeros and adds nothing.${K === NX ? " All the copies are in, and the sum is exactly y." : ""}`
        : `Copy ${K} is x[${K - 1}] = ${fmt(xk, 2)} times h, starting at n = ${K - 1}.${K === NX ? " All the copies are in, and the sum is exactly y." : ""}`;
    drawMatrix();
    plots.forEach((p) => p.request());
  }

  function drawMatrix() {
    const T = convMatrix(h, NX);
    const cell = (v, extra = "") => {
      const a = Math.min(1, Math.abs(v) / 1.5);
      const tint = v >= 0 ? "var(--blue)" : "var(--accent)";
      return `<td class="${extra}" style="background:color-mix(in oklab, ${tint} ${Math.round(a * 45)}%, transparent)">${Math.abs(v) < 1e-9 ? "·" : fmt(v, 2)}</td>`;
    };
    const rowsT = T.map((r, i) => `<tr class="${i === n ? "on" : ""}">${r.map((v) => cell(v)).join("")}</tr>`).join("");
    const rowsX = x.map((v) => `<tr>${cell(v)}</tr>`).join("");
    const rowsY = y.map((v, i) => `<tr class="${i === n ? "on" : ""}">${cell(v)}</tr>`).join("");
    mat.innerHTML = `<div class="cm-block"><p>T</p><table>${rowsT}</table></div><div class="cm-op">×</div>`
      + `<div class="cm-block"><p>x</p><table>${rowsX}</table></div><div class="cm-op">=</div>`
      + `<div class="cm-block"><p>y</p><table>${rowsY}</table></div>`;
  }
  update();

  return { destroy() { plots.forEach((p) => p.destroy()); anim.stop(); stopCopies(); } };
}
