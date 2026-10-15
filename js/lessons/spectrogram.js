// Lesson 22: the spectrogram, and the uncertainty principle. Short FFTs
// along a sound show when each frequency happens; the window length trades
// sharpness in time for sharpness in frequency. A Gaussian pulse shows the
// trade can't be beaten.

import { figure } from "../plot.js";
import { controls, el, fmt, legend, mathPanel, panel, prose, segmented, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { DUR, FS, gaussianWidths, preset, stft } from "./spectrogram-math.js";
import { listenButton, stopAll } from "../audio.js";

const PRESETS = [["chirp", "Chirp"], ["turns", "Two tones taking turns"], ["click", "Tone and a click"], ["melody", "A short tune"]];
const ABOUT = {
  chirp: "One tone sliding steadily from 40 Hz up to 460 Hz.",
  turns: "180 Hz and 330 Hz, switching every quarter second.",
  click: "A steady 250 Hz tone, with one sharp click at 1 second.",
  melody: "Eight notes, a quarter second each, each one fading after it starts.",
};

export function mount(root) {
  // Phones get taller figures and fewer tick labels.
  const narrow = window.matchMedia("(max-width: 640px)").matches;
  let name = "turns", win = 128;
  let x = preset(name), S = null, off = null;

  root.append(prose(`
    <p>One Fourier transform of a whole recording tells you <i>which</i> frequencies are in it, but not <i>when</i>. A tune and the same notes played backwards have the same spectrum.</p>
    <p>The fix is to chop the signal into short overlapping pieces and take a spectrum of each one. Stack those spectra side by side and you get a <b>spectrogram</b>: time across, frequency up, brightness for how strong each frequency is right then. That's the <b>short-time Fourier transform</b> (STFT), and it's what every music app and speech recognizer looks at.</p>
    <p>The catch is the length of the pieces. You'll see it as soon as you change the window length below.</p>`));

  /* ---------- Waveform ---------- */
  const fW = figure({ x: [0, DUR], y: [-1.3, 1.3], aspect: narrow ? 2.6 : 4.2, xTicks: 0.5, vAxis: false, ticks: true,
    cap: "The sound itself: two seconds, 1024 samples a second." });
  const pw = fW.plot;
  pw.draw((p) => {
    const step = Math.max(1, Math.floor(x.length / (p.w * 2)));
    const pts = [];
    for (let n = 0; n < x.length; n += step) pts.push([n / FS, Math.max(-1.25, Math.min(1.25, x[n]))]);
    p.path(pts, { color: p.c.blue, width: 1 });
    // The window, drawn at the start so you can see how long a piece is.
    p.rect(0, -1.3, win / FS, 1.3, { fill: p.c.accent, alpha: 0.15 });
    p.text(`one window: ${fmt((1000 * win) / FS, 0)} ms`, win / FS, 1.1, { color: p.c.accent, dx: 6, size: 12 });
  });

  /* ---------- Spectrogram ---------- */
  const fS = figure({ x: [0, DUR], y: [0, FS / 2], aspect: narrow ? 1.5 : 2.2, xTicks: 0.5, yTicks: 100, vAxis: false, xLabel: "s", yLabel: "Hz",
    cap: "The spectrogram. Each column is the spectrum of one window of the sound. Brighter means stronger." });
  const ps = fS.plot;
  ps.draw((p) => {
    if (!off) return;
    const { ctx } = p;
    const t0 = (S.win / 2 - S.hop / 2) / FS, t1 = ((S.frames - 1) * S.hop + S.win / 2 + S.hop / 2) / FS;
    const df = FS / S.win;
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.pad.l, p.pad.t, p.w - p.pad.l - p.pad.r, p.h - p.pad.t - p.pad.b);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    // Row 0 of the image is the top (highest frequency).
    ctx.drawImage(off, p.X(t0), p.Y(FS / 2 + df / 2), p.X(t1) - p.X(t0), p.Y(-df / 2) - p.Y(FS / 2 + df / 2));
    ctx.restore();
  });
  const onTheme = () => { paint(); ps.request(); };
  window.addEventListener("sb:theme", onTheme);

  const sound = segmented({ label: "Sound", value: name, options: PRESETS, onChange: (v) => { name = v; x = preset(v); compute(); } });
  const winSel = segmented({ label: "Window length", value: String(win), options: [32, 64, 128, 256, 512].map((n) => [String(n), `${n}`]),
    onChange: (v) => { win = +v; compute(); } });
  const about = el("p", { class: "small subtle", style: "margin:8px 0 0" });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  // The same sound at a proper audio rate (the figure's 1,024 samples a
  // second is too few to play). Frequencies are real: what you see is what you hear.
  const AUDIO = 22050;
  const hear = listenButton("Listen", () => ({ samples: preset(name, AUDIO, 3), rate: AUDIO }), "solid");

  root.append(panel("Spectra of short pieces",
    el("div", { class: "btn-row" }, sound.el, hear.el),
    about,
    fW.el,
    fS.el,
    el("p", { class: "small", style: "margin:12px 0 6px;font-weight:600", text: "Window length, in samples" }),
    winSel.el,
    status));

  root.append(tryIt([
    "On “Two tones taking turns”, use a 32-sample window. The switches are crisp in time, but each tone is a thick smear in frequency.",
    "Now use 512. Each tone is a thin line, but the switches blur together: one window spans two whole notes.",
    "On “Tone and a click”, the click is a thin vertical line with a short window and a wide blur with a long one. A click has every frequency at once.",
    "Press Listen on each sound and follow along on the spectrogram: the chirp's rising line is a rising pitch, the two tones take turns, the click is the tick in the middle.",
    "Find the window that shows the chirp as the thinnest rising line. It's in the middle: neither extreme wins.",
  ]));

  /* ---------- Uncertainty ---------- */
  root.append(prose(`
    <p>That trade-off isn't a flaw in the spectrogram. It's built into waves. A pulse that's short in time is made of a wide spread of frequencies, and a narrow spread of frequencies can only make a long pulse. Squeeze one and the other spreads out.</p>
    <p>A <b>Gaussian</b> pulse, the bell curve, is the best you can do: the product of its two widths is the smallest any signal can have. Slide its width and watch the product stay put. That fixed limit is the <b>uncertainty principle</b>. It's the same one as in quantum mechanics, where a particle's position and momentum play the roles of time and frequency.</p>`));

  let sigma = 0.02;
  let G = gaussianWidths(sigma);
  const fG = figure({ x: [-0.3, 0.3], y: [-0.05, 1.15], aspect: narrow ? 1.5 : 2, xTicks: narrow ? 0.2 : 0.1, vAxis: false, xLabel: "s",
    cap: "The pulse in time. The shaded band is ±σ<sub>t</sub>, its width." });
  const pg = fG.plot;
  pg.draw((p) => {
    p.rect(-G.st, 0, G.st, 1.1, { fill: p.c.blue, alpha: 0.12 });
    const pts = [];
    const step = Math.max(1, Math.floor(G.t.length / 1200));
    for (let i = 0; i < G.t.length; i += step) if (Math.abs(G.t[i]) <= 0.31) pts.push([G.t[i], G.g[i]]);
    p.path(pts, { color: p.c.blue, width: 2.4 });
  });
  const fF = figure({ x: [-150, 150], y: [-0.05, 1.15], aspect: narrow ? 1.5 : 2, xTicks: narrow ? 100 : 50, vAxis: false, xLabel: "Hz",
    cap: "Its spectrum, scaled to peak at 1. The shaded band is ±σ<sub>f</sub>." });
  const pf = fF.plot;
  pf.draw((p) => {
    p.rect(-G.sf, 0, G.sf, 1.1, { fill: p.c.green, alpha: 0.14 });
    const peak = Math.sqrt(Math.max(...G.P));
    const pts = [];
    for (let k = 0; k < G.f.length; k++) if (Math.abs(G.f[k]) <= 152) pts.push([G.f[k], Math.sqrt(G.P[k]) / peak]);
    pts.sort((a, b) => a[0] - b[0]);
    p.path(pts, { color: p.c.green, width: 2.4 });
  });
  const sSig = slider({ label: "Pulse width σ", min: 0.002, max: 0.1, step: 0.001, value: sigma, format: (v) => `${fmt(v * 1000, 0)} ms`,
    onInput: (v) => { sigma = v; G = gaussianWidths(sigma); updateG(); } });
  const gLine = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Short in time, wide in frequency",
    el("div", { class: "fig-row" }, fG.el, fF.el),
    controls(sSig.el),
    gLine));

  const m = mathPanel([
    { tex: "X[m, k] = \\sum_{n=0}^{L-1} x[n + mH]\\, w[n]\\, e^{-2\\pi i k n / L}", note: `The STFT: window ${inl("m")} starts at sample ${inl("mH")}, gets multiplied by a smooth window ${inl("w")} (a Hann window here), and goes through an ${inl("L")}-point DFT.` },
    { tex: "\\text{brightness} = 10 \\log_{10} |X[m, k]|^2 \\ \\text{dB}", note: "Strength in decibels, so quiet parts still show. The color scale spans the top 60 dB." },
    { id: "res", tex: "" },
    { tex: "\\Delta t = \\frac{L}{f_s}, \\qquad \\Delta f = \\frac{f_s}{L}, \\qquad \\Delta t\\, \\Delta f = 1", note: "A window L samples long covers L / f<sub>s</sub> seconds, and its DFT bins are f<sub>s</sub> / L apart. Make one smaller and the other grows." },
    { tex: "\\sigma_t\\, \\sigma_f \\ \\ge\\ \\frac{1}{4\\pi}", note: "The uncertainty principle, with widths measured as standard deviations of the energy in time and in frequency. Only a Gaussian reaches the limit." },
    { id: "gauss", tex: "" },
  ], [
    ["x[n]", "the sound, sample n"],
    ["w[n]", "the window: a smooth bump that fades each piece in and out"],
    ["L", "window length, in samples"],
    ["H", "hop: how far the window moves each step (a quarter of L here)"],
    ["m,\\ k", "which window (time), and which frequency bin"],
    ["X[m, k]", "how much of frequency bin k is in window m"],
    ["f_s", `sample rate, ${FS} samples a second`],
    ["\\Delta t,\\ \\Delta f", "the spectrogram's resolution in time and in frequency"],
    ["\\sigma", "the Gaussian pulse's width parameter"],
    ["\\sigma_t,\\ \\sigma_f", "the measured widths of the pulse's energy in time and in frequency"],
    ["\\text{dB}", "decibels: ten times the log of a power"],
  ]);
  root.append(m.el);
  root.append(upNext("sampling. Everything so far was already a list of samples. What happens when you sample a smooth wave too slowly?"));

  /* ---------- Painting the spectrogram image ---------- */
  function hexRgb(c) {
    const s = c.trim();
    if (s.startsWith("#")) {
      const h = s.length === 4 ? s.slice(1).split("").map((d) => d + d).join("") : s.slice(1);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    const m2 = s.match(/\d+(\.\d+)?/g);
    return m2 ? m2.slice(0, 3).map(Number) : [0, 0, 0];
  }
  function paint() {
    if (!S) return;
    const c = ps.c;
    const stops = [hexRgb(c.panel), hexRgb(c.blue), hexRgb(c.accent), hexRgb(c.gold)];
    off = off ?? document.createElement("canvas");
    off.width = S.frames; off.height = S.bins;
    const ctx = off.getContext("2d");
    const img = ctx.createImageData(S.frames, S.bins);
    let max = -Infinity;
    for (const v of S.db) if (v > max) max = v;
    const floor = max - 60;
    for (let f = 0; f < S.frames; f++) for (let k = 0; k < S.bins; k++) {
      const u = Math.max(0, Math.min(1, (S.db[f * S.bins + k] - floor) / 60));
      const pos = u * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(pos)), a = pos - i;
      const rgb = stops[i].map((v, j) => v + (stops[i + 1][j] - v) * a);
      img.data.set([rgb[0], rgb[1], rgb[2], 255], ((S.bins - 1 - k) * S.frames + f) * 4);
    }
    ctx.putImageData(img, 0, 0);
  }

  function compute() {
    S = stft(x, win, win / 4);
    paint();
    about.textContent = ABOUT[name];
    status.textContent = `Window ${win} samples = ${fmt((1000 * win) / FS, 1)} ms long. Frequency bins ${fmt(FS / win, 1)} Hz apart.`;
    m.set("res", `L = ${win}:\\quad \\Delta t = ${num((1000 * win) / FS, 1)}\\ \\text{ms}, \\quad \\Delta f = ${num(FS / win, 1)}\\ \\text{Hz}`);
    pw.request(); ps.request();
  }
  function updateG() {
    const prod = G.st * G.sf;
    gLine.textContent = `σt = ${fmt(G.st * 1000, 1)} ms, σf = ${fmt(G.sf, 2)} Hz. Product: ${fmt(prod, 4)}, against the limit 1/(4π) = ${fmt(1 / (4 * Math.PI), 4)}.`;
    m.set("gauss", `\\sigma_t = ${num(G.st * 1000, 1)}\\ \\text{ms}, \\quad \\sigma_f = ${num(G.sf, 2)}\\ \\text{Hz}, \\quad \\sigma_t \\sigma_f = ${num(prod, 4)}`);
    pg.request(); pf.request();
  }
  compute();
  updateG();

  return {
    destroy() {
      stopAll();
      window.removeEventListener("sb:theme", onTheme);
      pw.destroy(); ps.destroy(); pg.destroy(); pf.destroy();
    },
  };
}
