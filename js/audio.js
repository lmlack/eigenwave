// Sound for lessons. One sound plays at a time; starting another stops the
// last one. Every buffer is scaled to a modest peak and faded in and out, so
// nothing clicks or blasts. Sound only ever starts from a button press.
//
//   const btn = listenButton("Hear it", () => ({ samples, rate }));
//   root.append(btn.el);
//
// make() returns { samples: Float32Array or number[], rate: samples per second }.
// The rate can be as low as 3000 per second: the browser resamples it cleanly,
// which is exactly what the aliasing demos need.

import { el } from "./ui.js";

let ctx = null;
let current = null; // { src, onEnd }

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export const PEAK = 0.3;

/** Scale to a fixed peak and fade the ends, in place on a copy. */
export function prepare(samples, rate, fade = 0.01) {
  const out = Float32Array.from(samples);
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? PEAK / peak : 0;
  const nf = Math.min(Math.floor(fade * rate), Math.floor(out.length / 2));
  for (let i = 0; i < out.length; i++) {
    let w = 1;
    if (i < nf) w = i / nf;
    else if (i >= out.length - nf) w = (out.length - 1 - i) / nf;
    out[i] *= g * w;
  }
  return out;
}

/** Play a buffer. Returns a stop function. onEnd runs when it finishes or is stopped. */
export function play(samples, rate, onEnd) {
  stop();
  const a = audio();
  const r = Math.max(3000, Math.min(192000, Math.round(rate)));
  const data = prepare(samples, r);
  const buf = a.createBuffer(1, data.length, r);
  buf.copyToChannel(data, 0);
  const src = a.createBufferSource();
  src.buffer = buf;
  src.connect(a.destination);
  const me = { src, onEnd };
  src.onended = () => {
    if (current === me) current = null;
    me.onEnd?.();
  };
  current = me;
  src.start();
  return stop;
}

export function stop() {
  if (!current) return;
  const c = current;
  current = null;
  // Tell the button now, rather than waiting for "ended": a suspended or
  // silent audio device may never send it.
  c.src.onended = null;
  try { c.src.stop(); } catch { /* already stopped */ }
  c.onEnd?.();
}

/** Stop sound when the lesson closes. */
export const stopAll = stop;

/**
 * A button that plays a sound and turns into "Stop" while it plays.
 * make() is called on each press, so the sound always matches the figure.
 */
export function listenButton(label, make, kind = "") {
  const b = el("button", { type: "button", class: `btn listen ${kind}`, "aria-pressed": "false" });
  const icon = (on) => (on
    ? '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" style="flex:none"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" style="flex:none"><path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z" fill="currentColor"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>');
  let playing = false;
  const set = (on) => {
    playing = on;
    b.setAttribute("aria-pressed", String(on));
    b.innerHTML = `${icon(on)}<span>${on ? "Stop" : label}</span>`;
  };
  set(false);
  b.addEventListener("click", () => {
    if (playing) { stop(); return; }
    const { samples, rate } = make();
    set(true);
    play(samples, rate, () => set(false));
  });
  return { el: b, stop: () => { if (playing) stop(); } };
}

/** Samples of f(t) for `seconds` at `rate`, t in seconds. */
export function synth(f, seconds, rate = 22050) {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = f(i / rate);
  return out;
}
