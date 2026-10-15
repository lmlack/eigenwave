// Lesson 23: sampling and aliasing. A sine, a sample rate, the slower sine
// that fits the same dots, the spectrum's copies, sinc reconstruction, and a
// wagon wheel filmed by a camera.

import { animate, figure } from "../plot.js";
import { check, controls, el, fmt, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { aliasOf, apparentSpin, sincRebuild } from "./sampling-math.js";
import { listenButton, stopAll } from "../audio.js";
import { reconstruct, render, sampledSine, sampledSweep } from "../sound-math.js";

const TAU = 2 * Math.PI;

export function mount(root) {
  // Phones get taller figures and fewer tick labels.
  const narrow = window.matchMedia("(max-width: 640px)").matches;
  let f = 3, fs = 10;
  let showAlias = true, showSinc = false;

  root.append(prose(`
    <p>A computer can't store a smooth wave. It stores <b>samples</b>: the wave's value every ${inl("T")} seconds, ${inl("f_s = 1/T")} times a second. Between the samples, it knows nothing.</p>
    <p>Is there only one smooth wave through a given set of dots? If the wave is slow enough compared with the sampling, yes. If it isn't, a slower wave fits the very same dots, and once you've sampled there's no way to tell them apart. That's <b>aliasing</b>.</p>`));

  /* ---------- Figure 1: the sine and its samples ---------- */
  const fT = figure({ x: [0, 2], y: [-1.4, 1.4], aspect: narrow ? 1.6 : 2.5, xTicks: 0.5, vAxis: false, xLabel: "s",
    cap: "The wave (blue), its samples (orange dots), and the slowest wave through the same dots (green, dashed)." });
  const pt = fT.plot;
  pt.draw((p) => {
    p.fn((t) => Math.sin(TAU * f * t), { color: p.c.blue, width: 2, alpha: 0.85 });
    const a = aliasOf(f, fs);
    if (showAlias && Math.abs(Math.abs(a) - f) > 1e-9) p.fn((t) => Math.sin(TAU * a * t), { color: p.c.green, width: 2.4, dash: [7, 5] });
    if (showSinc) {
      // Samples well past both ends, so the edges of the view rebuild cleanly.
      const n0 = Math.floor(-3 * fs), n1 = Math.ceil(5 * fs);
      const vals = [];
      for (let n = n0; n <= n1; n++) vals.push(Math.sin((TAU * f * n) / fs));
      p.fn((t) => sincRebuild(vals, n0, 1 / fs, t), { color: p.c.purple, width: 2.4 });
    }
    const ts = [], vs = [];
    for (let n = 0; n / fs <= 2 + 1e-9; n++) { ts.push(n / fs); vs.push(Math.sin((TAU * f * n) / fs)); }
    p.stems(ts, vs, { color: p.c.accent, r: 4, width: 1.2 });
  });

  /* ---------- Figure 2: the spectrum ---------- */
  const fF = figure({ x: [-25, 25], y: [0, 1.25], aspect: narrow ? 1.8 : 3, xTicks: narrow ? 10 : 5, vAxis: false, xLabel: "Hz", ticks: true,
    cap: "Frequencies. Sampling copies the wave's two spikes (±f) every f<sub>s</sub>. Only the shaded band, −f<sub>s</sub>/2 to f<sub>s</sub>/2, survives; whatever copy lands in it is what the samples show." });
  const pf = fF.plot;
  pf.draw((p) => {
    p.rect(-fs / 2, 0, fs / 2, 1.2, { fill: p.c.green, alpha: 0.12 });
    const copies = [];
    for (let m = -8; m <= 8; m++) for (const s of [f, -f]) {
      const x = s + m * fs;
      if (Math.abs(x) <= 25.5) copies.push(x);
    }
    p.stems(copies, copies.map(() => 0.55), { color: p.c.fgSubtle, r: 2.5, width: 1.2, alpha: 0.6 });
    p.stems([f, -f], [1, 1], { color: p.c.blue, r: 4, width: 2 });
    const a = Math.abs(aliasOf(f, fs));
    p.stems([a, -a], [0.8, 0.8], { color: p.c.green, r: 4, width: 3 });
    p.line(fs / 2, 0, fs / 2, 1.2, { color: p.c.green, width: 1, dash: [3, 4] });
    p.line(-fs / 2, 0, -fs / 2, 1.2, { color: p.c.green, width: 1, dash: [3, 4] });
    p.text("fs/2", fs / 2, 1.15, { color: p.c.green, dx: 4, size: 11 });
  });

  const sF = slider({ label: "Wave frequency f", min: 0.2, max: 22, step: 0.1, value: f, format: (v) => `${fmt(v, 1)} Hz`, onInput: (v) => { f = v; update(); } });
  const sFs = slider({ label: "Sample rate f<sub>s</sub>", min: 1, max: 25, step: 0.5, value: fs, format: (v) => `${fmt(v, 1)} /s`, onInput: (v) => { fs = v; update(); } });
  const cA = check({ label: "Show the slower wave through the same dots", checked: true, onChange: (v) => { showAlias = v; pt.request(); } });
  const cS = check({ label: "Rebuild from the samples (sinc)", onChange: (v) => { showSinc = v; pt.request(); } });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  // To hear it, every frequency here is scaled up 300 times: 3 Hz becomes
  // 900 Hz and a sample rate of 10 becomes 3,000 samples a second. The
  // samples are rebuilt into sound with sinc pulses, like a real converter,
  // so what you hear is exactly what the samples say.
  const HEAR = 300, OUT = 22050;
  const hearWave = listenButton("The wave", () => ({ samples: render((t) => Math.sin(TAU * f * HEAR * t), 1.5, OUT), rate: OUT }));
  const hearSamples = listenButton("Its samples", () => ({ samples: reconstruct(sampledSine(f * HEAR, fs * HEAR, 1.5), fs * HEAR, OUT), rate: OUT }), "solid");
  const hearSweep = listenButton("A rising sweep", () => ({ samples: reconstruct(sampledSweep(0.05 * fs * HEAR, 0.97 * fs * HEAR, fs * HEAR, 4), fs * HEAR, OUT), rate: OUT }));

  root.append(panel("Dots, and the waves that fit them",
    fT.el,
    legend([["--blue", "the wave"], ["--accent", "samples"], ["--green", "alias"], ["--purple", "rebuilt from samples"]]),
    fF.el,
    controls(sF.el, sFs.el),
    el("div", { class: "btn-row", style: "margin-top:10px" }, cA.el, cS.el),
    status,
    el("div", { class: "btn-row", style: "margin-top:12px" }, hearWave.el, hearSamples.el, hearSweep.el),
    el("p", { class: "small subtle", style: "margin:6px 0 0", text: "Sounds are 300 times higher than the plot, so 3 Hz plays as 900 Hz. “Its samples” plays only what the dots say. The sweep's true pitch rises all the way, but past half the sample rate what you hear turns around and falls." })));

  root.append(tryIt([
    "Keep f<sub>s</sub> at 10 and slide f up from 3. Past 5 Hz, half the sample rate, a green wave appears: slower, and through every dot.",
    "Set f to 9 Hz. The samples trace a 1 Hz wave, going the wrong way. Set it to 10 and every sample is zero: the wave seems to vanish.",
    "Turn on “Rebuild from the samples”. Below f<sub>s</sub>/2 the purple curve lands on the blue wave. Above it, the purple curve follows the green alias: that's all the samples can give back.",
    "Watch the spectrum while you do it: the green spike is whichever copy of the wave lands in the shaded band.",
    "With f<sub>s</sub> at 10, set f to 3 and press “The wave”, then “Its samples”: the same note. Now set f to 7 and do it again. The samples play a lower note, the 3 Hz alias. Then play the sweep and hear the pitch turn around halfway.",
  ]));

  /* ---------- Figure 3: the wagon wheel ---------- */
  root.append(prose(`
    <p>You've seen aliasing in films. A wagon wheel or a car's hubcap turns faster and faster, then seems to slow down, stop and spin backwards. The camera is sampling: it takes a frame ${inl("f_s")} times a second. A wheel with identical spokes looks the same every time it turns one spoke-gap, so what the camera samples is the spoke pattern, and that pattern's frequency gets folded just like the sine's.</p>`));

  let rps = 1.5, fps = 24, angle = 0, camAngle = 0, sinceFrame = 0, playing = true;
  const SPOKES = 6;
  const fWheel = figure({ x: [-2.4, 2.4], y: [-1.2, 1.2], equal: true, aspect: narrow ? 1.5 : 2, grid: false, axes: false,
    cap: "Left: the real wheel. Right: what the camera sees, one frame every 1/f<sub>s</sub> seconds." });
  const pwh = fWheel.plot;
  const wheel = (p, cx, a, color) => {
    p.circle(cx, 0, 1, { color, width: 3 });
    for (let i = 0; i < SPOKES; i++) {
      const th = a + (i * TAU) / SPOKES;
      p.line(cx, 0, cx + Math.cos(th), Math.sin(th), { color, width: i === 0 ? 3 : 2 });
    }
    p.dot(cx, 0, { r: 5, color });
  };
  pwh.draw((p) => {
    wheel(p, -1.2, angle, p.c.fgMuted);
    wheel(p, 1.2, camAngle, p.c.accent);
    p.text("real", -1.2, -1.12, { align: "center", color: p.c.fgSubtle, size: 12 });
    p.text("camera", 1.2, -1.12, { align: "center", color: p.c.accent, size: 12 });
  });
  const loop = animate(fWheel.el, (dt) => {
    angle -= TAU * rps * dt;
    sinceFrame += dt;
    if (sinceFrame >= 1 / fps) {
      sinceFrame %= 1 / fps;
      camAngle = angle;
    }
    pwh.request();
  }, () => playing);
  const sR = slider({ label: "Wheel speed", min: 0, max: 8, step: 0.05, value: rps, format: (v) => `${fmt(v, 2)} turns/s`, onInput: (v) => { rps = v; updateWheel(); } });
  const sC = slider({ label: "Camera frame rate", min: 6, max: 60, step: 1, value: fps, format: (v) => `${fmt(v, 0)} /s`, onInput: (v) => { fps = v; updateWheel(); } });
  const wheelStatus = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("The wagon wheel", fWheel.el, controls(sR.el, sC.el), wheelStatus));
  root.append(tryIt([
    `At 24 frames a second, set the wheel to 4 turns a second. Six spokes pass the top 24 times a second, once per frame, so the camera's wheel stands still.`,
    "Nudge the speed just under 4: the camera's wheel creeps backwards. Just over 4: it creeps forwards.",
  ]));

  const m = mathPanel([
    { tex: "x[n] = x(nT), \\qquad f_s = \\frac{1}{T}", note: "Sampling: keep the wave's value every T seconds." },
    { tex: "\\sin(2\\pi f\\, nT) = \\sin\\!\\big(2\\pi (f - m f_s)\\, nT\\big) \\ \\text{ for every whole } m", note: `Adding a whole multiple of ${inl("f_s")} changes the angle at each sample by a whole number of turns, so the samples can't tell those frequencies apart.` },
    { tex: "f_\\text{alias} = f - f_s \\cdot \\operatorname{round}(f / f_s)", note: `The one in ${inl("-f_s/2")} to ${inl("f_s/2")} is what the samples show. A negative alias is the same wave running backwards.` },
    { id: "alias", tex: "" },
    { tex: "f < \\frac{f_s}{2}", note: "The sampling theorem (Nyquist–Shannon): if every frequency in the wave is below half the sample rate, the samples pin it down exactly." },
    { tex: "x(t) = \\sum_{n} x[n]\\ \\operatorname{sinc}\\!\\Big(\\frac{t - nT}{T}\\Big), \\qquad \\operatorname{sinc}(u) = \\frac{\\sin \\pi u}{\\pi u}", note: "And this rebuilds it: one sinc per sample, each 1 at its own sample time and 0 at every other one. In frequency, it's an ideal low-pass that keeps only the shaded band." },
    { id: "wheel", tex: "" },
  ], [
    ["x(t)", "the smooth wave, at any time t"],
    ["x[n]", "sample n: the wave's value at time nT"],
    ["T,\\ f_s", "time between samples, and samples per second"],
    ["f", "the wave's frequency, in Hz"],
    ["m", "any whole number"],
    ["f_\\text{alias}", "the frequency the samples seem to have"],
    ["f_s / 2", "the Nyquist frequency: the fastest wave the samples can hold"],
    ["\\operatorname{sinc}", "the interpolating bump, sin(πu)/(πu)"],
    ["r", "the wheel's speed, in turns a second"],
    ["S", `number of spokes, ${SPOKES}`],
  ]);
  root.append(m.el);
  root.append(upNext("modulation: deliberately sliding a signal's spectrum up to a high frequency, which is how radio fits many stations into one sky."));

  function update() {
    const a = aliasOf(f, fs);
    const folded = Math.abs(Math.abs(a) - f) > 1e-9;
    status.textContent = !folded
      ? `${fmt(f, 1)} Hz is below fs/2 = ${fmt(fs / 2, 2)} Hz: the samples pin the wave down.`
      : Math.abs(a) < 1e-9
        ? `${fmt(f, 1)} Hz is a whole multiple of the sample rate: every sample lands at the same point, and the wave looks like a constant.`
        : `${fmt(f, 1)} Hz is above fs/2 = ${fmt(fs / 2, 2)} Hz. The samples look like ${fmt(Math.abs(a), 2)} Hz${a < 0 ? ", running backwards" : ""}.`;
    m.set("alias", `f = ${num(f, 1)},\\ f_s = ${num(fs, 1)}:\\quad f_\\text{alias} = ${num(a, 2)}\\ \\text{Hz}`);
    pt.request(); pf.request();
  }
  function updateWheel() {
    const app = apparentSpin(rps, fps, SPOKES);
    wheelStatus.textContent = Math.abs(app) < 0.005
      ? "The camera's wheel looks still: the spokes move exactly one gap (or a whole number of gaps) per frame."
      : `Real: ${fmt(rps, 2)} turns a second. Camera: looks like ${fmt(Math.abs(app), 2)} turns a second${Math.sign(app) !== Math.sign(rps) && rps > 0 ? ", backwards" : ""}.`;
    m.set("wheel", `\\text{wheel: } r S = ${num(rps * SPOKES, 1)}\\ \\text{spokes/s}, \\ f_s = ${fps} \\ \\Rightarrow\\ \\text{looks like } ${num(app, 2)}\\ \\text{turns/s}`);
  }
  update();
  updateWheel();

  return { destroy() { stopAll(); loop.stop(); pt.destroy(); pf.destroy(); pwh.destroy(); } };
}
