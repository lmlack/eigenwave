// Lesson 24: modulation. Multiply a slow message by a fast carrier and its
// spectrum moves to ±fc; multiply again and low-pass to get it back. Then two
// stations on two carriers, and what happens when they're too close.

import { figure } from "../plot.js";
import { controls, el, fmt, legend, mathPanel, panel, prose, slider, tryIt, upNext } from "../ui.js";
import { inl, num } from "../tex.js";
import { listenButton, stopAll } from "../audio.js";
import { fftFilter, render } from "../sound-math.js";
import { BANDWIDTH, demodulate, message1, message2, modulate, rmsError, spectrum, t } from "./modulation-math.js";

const SHOW = 1; // seconds of signal on screen

export function mount(root) {
  // Phones get taller figures and fewer tick labels.
  const narrow = window.matchMedia("(max-width: 640px)").matches;
  let fc = 20, phi = 0, cutoff = 8;
  const m1 = t.map(message1);
  let y = modulate(m1, fc), demod = demodulate(y, fc, phi, cutoff);

  root.append(prose(`
    <p>A voice is slow: most of its energy is below a few thousand hertz. An antenna wants fast waves, millions of cycles a second. And if every station sent its voice as-is, they'd all land on the same frequencies and drown each other out.</p>
    <p><b>Modulation</b> fixes both. Multiply the message by a fast cosine, the <b>carrier</b>. In time, the result is a fast wave whose height follows the message. In frequency, the message's whole spectrum slides up and sits around the carrier frequency. Each station picks its own carrier, and they share the air side by side. Here everything's slowed down to a few hertz so you can see it.</p>`));

  /* ---------- Figure 1: in time ---------- */
  const tPts = (arr, n = Math.round(SHOW * 256)) => Array.from({ length: n + 1 }, (_, i) => [t[i], arr[i]]);
  const fTime = figure({ x: [0, SHOW], y: [-1.3, 1.3], aspect: narrow ? 1.6 : 2.5, xTicks: narrow ? 0.2 : 0.1, vAxis: false, xLabel: "s",
    cap: "The message (dashed), and the modulated signal: the message times the carrier (orange)." });
  const ptm = fTime.plot;
  ptm.draw((p) => {
    p.path(tPts(y), { color: p.c.accent, width: 1.6 });
    p.path(tPts(m1), { color: p.c.blue, width: 2, dash: [6, 4] });
    p.path(tPts(m1.map((v) => -v)), { color: p.c.blue, width: 1.2, dash: [2, 4], alpha: 0.6 });
  });

  /* ---------- Figure 2: in frequency ---------- */
  const fSpec = figure({ x: [-60, 60], y: [0, 0.38], aspect: narrow ? 1.8 : 3, xTicks: narrow ? 20 : 10, vAxis: false, xLabel: "Hz",
    cap: "Spectra. The message (blue) sits around 0 Hz. After modulation (orange) the same shape sits at +fc and at −fc, each half as tall." });
  const psp = fSpec.plot;
  psp.draw((p) => {
    const sm = spectrum(m1).filter(([f]) => Math.abs(f) <= 60);
    const sy = spectrum(y).filter(([f]) => Math.abs(f) <= 60);
    p.stems(sm.map((q) => q[0]), sm.map((q) => q[1]), { color: p.c.blue, r: 0, width: 2.5, alpha: 0.7 });
    p.stems(sy.map((q) => q[0]), sy.map((q) => q[1]), { color: p.c.accent, r: 0, width: 2.5 });
    for (const s of [fc, -fc]) p.line(s, 0, s, 0.36, { color: p.c.accent, width: 1, dash: [3, 4] });
    p.text("fc", fc, 0.35, { color: p.c.accent, dx: 4, size: 11 });
  });

  /* ---------- Figure 3: getting it back ---------- */
  const fBack = figure({ x: [0, SHOW], y: [-1.8, 1.8], aspect: narrow ? 1.6 : 2.5, xTicks: narrow ? 0.2 : 0.1, vAxis: false, xLabel: "s",
    cap: "The receiver multiplies by its own carrier (faint), then low-passes to get the message back (green). The original is dashed." });
  const pb = fBack.plot;
  pb.draw((p) => {
    p.path(tPts(demod.mixed), { color: p.c.purple, width: 1.2, alpha: 0.35 });
    p.path(tPts(m1), { color: p.c.blue, width: 2, dash: [6, 4] });
    p.path(tPts(demod.out), { color: p.c.green, width: 2.6 });
  });

  const sFc = slider({ label: "Carrier frequency f<sub>c</sub>", min: 8, max: 50, step: 0.5, value: fc, format: (v) => `${fmt(v, 1)} Hz`, onInput: (v) => { fc = v; update(); } });
  const sPhi = slider({ label: "Receiver's carrier phase error", min: 0, max: 180, step: 1, value: 0, format: (v) => `${fmt(v, 0)}°`, onInput: (v) => { phi = (v * Math.PI) / 180; update(); } });
  const sCut = slider({ label: "Receiver's low-pass cutoff", min: 2, max: 40, step: 0.5, value: cutoff, format: (v) => `${fmt(v, 1)} Hz`, onInput: (v) => { cutoff = v; update(); } });
  const status = el("p", { class: "small", style: "margin:10px 0 0" });
  // Sounds run 100 times faster than the plots: the 1.5 Hz and 4 Hz message
  // tones play at 150 and 400 Hz, and a 20 Hz carrier at 2,000 Hz.
  const HEAR = 100, RATE = 16000, SECS = 2;
  const TWO_PI = 2 * Math.PI;
  const msg = () => render((tt) => message1(HEAR * tt), SECS, RATE);
  const sent = () => render((tt) => message1(HEAR * tt) * Math.cos(TWO_PI * fc * HEAR * tt), SECS, RATE);
  const received = () => {
    const mixed = sent().map((v, i) => 2 * v * Math.cos(TWO_PI * fc * HEAR * (i / RATE) + phi));
    return fftFilter(mixed, RATE, (fr) => (fr <= cutoff * HEAR ? 1 : 0));
  };
  const hearMsg = listenButton("Message", () => ({ samples: msg(), rate: RATE }));
  const hearSent = listenButton("Sent", () => ({ samples: sent(), rate: RATE }));
  const hearRx = listenButton("Received", () => ({ samples: received(), rate: RATE }), "solid");

  root.append(panel("Send it up, bring it back",
    fTime.el,
    legend([["--blue", "message m(t), and its mirror"], ["--accent", "message × carrier"]]),
    fSpec.el,
    fBack.el,
    legend([["--purple", "after multiplying again"], ["--green", "after the low-pass"], ["--blue", "original message"]]),
    controls(sFc.el, sPhi.el, sCut.el),
    status,
    el("div", { class: "btn-row", style: "margin-top:12px" }, hearMsg.el, hearSent.el, hearRx.el),
    el("p", { class: "small subtle", style: "margin:6px 0 0", text: "Sounds run 100 times faster than the plots. “Sent” is a high, rough tone: the message moved up around the carrier. “Received” should sound like the message again, and it fades as the phase error nears 90°." })));

  root.append(tryIt([
    "Slide the carrier frequency. The message's spectrum rides along to ±f<sub>c</sub> without changing shape.",
    "Turn the phase error up to 90°. The receiver's carrier is now a sine where the sender's was a cosine, and the message disappears completely. Real radios have to lock onto the carrier's phase.",
    "Play Message, Sent and Received in turn. Then set the phase error to 90° and play Received again: silence, or close to it.",
    "Push the low-pass cutoff above 2 f<sub>c</sub> minus the message's width. A copy of the message parked at 2 f<sub>c</sub> gets through, and the green line fills with fast wiggles.",
  ]));

  /* ---------- Two stations ---------- */
  root.append(prose(`
    <p>Now two stations. Each multiplies its own message by its own carrier, and the two signals simply add in the air. A receiver tunes to one by multiplying by that station's carrier and low-passing. That's <b>frequency-division multiplexing</b>: stations take turns in frequency, not in time.</p>
    <p>It works as long as their spectra don't overlap. Each message is about ${inl(`${BANDWIDTH}`)} Hz wide, so each station takes up ${inl(`2 \\times ${BANDWIDTH}`)} Hz around its carrier. Put the carriers too close and the slices overlap. Then no filter can pull them apart.</p>`));

  let fa = 15, fb = 35;
  const m2 = t.map(message2);
  let both = null, rx = null;
  const fBoth = figure({ x: [0, 60], y: [0, 0.2], aspect: narrow ? 1.8 : 3, xTicks: narrow ? 20 : 10, vAxis: false, xLabel: "Hz",
    cap: "Positive frequencies of what's in the air: station 1 (blue) and station 2 (purple). The receiver keeps the shaded band around f<sub>1</sub>." });
  const pbo = fBoth.plot;
  pbo.draw((p) => {
    p.rect(fa - BANDWIDTH - 0.5, 0, fa + BANDWIDTH + 0.5, 0.2, { fill: p.c.green, alpha: 0.12 });
    const s1 = spectrum(modulate(m1, fa)).filter(([f]) => f >= 0 && f <= 60);
    const s2 = spectrum(modulate(m2, fb)).filter(([f]) => f >= 0 && f <= 60);
    p.stems(s1.map((q) => q[0]), s1.map((q) => q[1]), { color: p.c.blue, r: 0, width: 2.5, alpha: 0.8 });
    p.stems(s2.map((q) => q[0]), s2.map((q) => q[1]), { color: p.c.purple, r: 0, width: 2.5, alpha: 0.8 });
  });
  const fRx = figure({ x: [0, 2], y: [-1.3, 1.3], aspect: narrow ? 1.7 : 2.8, xTicks: 0.5, vAxis: false, xLabel: "s",
    cap: "What the receiver tuned to station 1 hears (green), against station 1's real message (dashed)." });
  const prx = fRx.plot;
  prx.draw((p) => {
    p.path(Array.from(t, (tt, n) => [tt, m1[n]]), { color: p.c.blue, width: 2, dash: [6, 4] });
    p.path(Array.from(t, (tt, n) => [tt, rx[n]]), { color: p.c.green, width: 2.4 });
  });
  const sA = slider({ label: "Station 1 carrier f<sub>1</sub>", min: 8, max: 50, step: 0.5, value: fa, format: (v) => `${fmt(v, 1)} Hz`, onInput: (v) => { fa = v; updateTwo(); } });
  const sB = slider({ label: "Station 2 carrier f<sub>2</sub>", min: 8, max: 50, step: 0.5, value: fb, format: (v) => `${fmt(v, 1)} Hz`, onInput: (v) => { fb = v; updateTwo(); } });
  const twoStatus = el("p", { class: "small", style: "margin:10px 0 0" });
  root.append(panel("Two stations, one sky", fBoth.el, fRx.el, controls(sA.el, sB.el), twoStatus));
  root.append(tryIt([
    "Slide station 2 toward station 1. While the gap between carriers is more than about 9 Hz, the green line matches the dashed one.",
    "Bring them within a few hertz of each other. Station 2's slice falls inside station 1's band, and its message bleeds into what you hear.",
  ]));

  const m = mathPanel([
    { tex: "y(t) = m(t)\\cos(2\\pi f_c t)", note: "Modulate: multiply the message by the carrier." },
    { tex: "\\cos\\theta = \\tfrac12\\big(e^{i\\theta} + e^{-i\\theta}\\big) \\ \\Rightarrow\\ Y(f) = \\tfrac12 M(f - f_c) + \\tfrac12 M(f + f_c)", note: "A cosine is half a turn each way, so the message's spectrum is copied to +f<sub>c</sub> and to −f<sub>c</sub>, at half height." },
    { tex: "2\\,y(t)\\cos(2\\pi f_c t + \\varphi) = m(t)\\cos\\varphi + m(t)\\cos(4\\pi f_c t + \\varphi)", note: `Demodulate: multiply by the carrier again. One part is the message (scaled by ${inl("\\cos\\varphi")}); the other is parked up at ${inl("2 f_c")}, where a low-pass throws it away.` },
    { id: "rx", tex: "" },
    { tex: "|f_1 - f_2| > 2B", note: "Two stations can share the air if their carriers are more than twice a message's bandwidth apart." },
    { id: "two", tex: "" },
  ], [
    ["m(t)", "the message: the slow signal you want to send"],
    ["f_c", "the carrier frequency"],
    ["y(t)", "the modulated signal that goes out"],
    ["M(f),\\ Y(f)", "the spectra of the message and of the modulated signal"],
    ["\\theta", "any angle"],
    ["\\varphi", "the receiver's carrier phase error"],
    ["B", `the message's bandwidth, about ${BANDWIDTH} Hz here`],
    ["f_1,\\ f_2", "the two stations' carriers"],
    ["\\text{RMS}", "root-mean-square error: the typical size of the difference"],
  ]);
  root.append(m.el);
  root.append(upNext(`that's the end of the course for now. Head back to <a href="#home">all lessons</a>. Oppenheim's later chapters take the same ideas further: the Laplace transform and the z-transform let the frequency be complex too, which is how engineers design filters and check whether a feedback loop is stable.`));

  function update() {
    y = modulate(m1, fc);
    demod = demodulate(y, fc, phi, cutoff);
    const err = rmsError(demod.out, m1);
    const leak = cutoff > 2 * fc - BANDWIDTH;
    const low = cutoff < BANDWIDTH;
    status.textContent = leak
      ? `The cutoff (${fmt(cutoff, 1)} Hz) reaches the copy at 2 fc = ${fmt(2 * fc, 0)} Hz, so fast wiggles leak through.`
      : low
        ? `The cutoff (${fmt(cutoff, 1)} Hz) is below the message's ${BANDWIDTH} Hz: part of the message itself gets cut.`
        : Math.abs(Math.cos(phi)) < 0.05
          ? "The receiver's carrier is 90° off. The message is multiplied by cos 90° = 0, and nothing comes out."
          : `Recovered, scaled by cos ${fmt((phi * 180) / Math.PI, 0)}° = ${fmt(Math.cos(phi), 2)}. Error against the message: ${fmt(err, 3)}.`;
    m.set("rx", `f_c = ${num(fc, 1)},\\ \\varphi = ${num((phi * 180) / Math.PI, 0)}^\\circ:\\quad \\cos\\varphi = ${num(Math.cos(phi), 2)}, \\quad \\text{RMS error} = ${num(err, 3)}`);
    ptm.request(); psp.request(); pb.request();
  }
  function updateTwo() {
    const s2 = modulate(m2, fb);
    both = modulate(m1, fa).map((v, n) => v + s2[n]);
    rx = demodulate(both, fa, 0, BANDWIDTH + 0.5).out;
    const err = rmsError(rx, m1);
    const gap = Math.abs(fa - fb);
    twoStatus.textContent = gap > 2 * BANDWIDTH
      ? `Carriers ${fmt(gap, 1)} Hz apart: the slices don't overlap, and station 1 comes through clean (error ${fmt(err, 3)}).`
      : `Carriers only ${fmt(gap, 1)} Hz apart: the slices overlap, and station 2 leaks in (error ${fmt(err, 2)}).`;
    m.set("two", `|f_1 - f_2| = ${num(gap, 1)} \\ ${gap > 2 * BANDWIDTH ? ">" : "\\le"}\\ 2B = ${num(2 * BANDWIDTH, 1)}, \\quad \\text{RMS error} = ${num(err, 3)}`);
    pbo.request(); prx.request();
  }
  update();
  updateTwo();

  return { destroy() { stopAll(); ptm.destroy(); psp.destroy(); pb.destroy(); pbo.destroy(); prx.destroy(); } };
}
