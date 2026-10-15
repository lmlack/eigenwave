// Math for Part 5 (Laplace, z-transform, the big picture), free of the DOM so
// it can be tested. Complex numbers are [re, im] pairs, as in js/cmath.js.
//
// A system is given by its poles and zeros. Poles and zeros come in
// conjugate pairs (or sit on the real axis), so every impulse response here
// is real.

import { cabs, cadd, cdiv, cis, cmul, csub } from "../cmath.js";

export const cexp = (z) => {
  const m = Math.exp(z[0]);
  return [m * Math.cos(z[1]), m * Math.sin(z[1])];
};

/** H(x) = g · Π(x − zero) / Π(x − pole), for s or z alike. */
export function rational(x, poles, zeros, g = 1) {
  let num = [g, 0], den = [1, 0];
  for (const q of zeros) num = cmul(num, csub(x, q));
  for (const p of poles) den = cmul(den, csub(x, p));
  return cdiv(num, den);
}

/** A point and its mirror image, or just the point when it sits on the real axis. */
export function withConjugates(pts) {
  const out = [];
  for (const p of pts) {
    out.push(p);
    if (Math.abs(p[1]) > 1e-9) out.push([p[0], -p[1]]);
  }
  return out;
}

/**
 * Impulse response of H(s) = g Π(s − zero)/Π(s − pole) by partial fractions:
 * h(t) = Σ r_k e^{p_k t}, r_k = g Π(p_k − zero) / Π_{j≠k}(p_k − p_j).
 * Needs fewer zeros than poles and distinct poles (nudged apart if not).
 */
export function residues(poles, zeros, g = 1) {
  const ps = poles.map((p, i) => {
    // Repeated poles have no simple residues; a tiny nudge keeps the sum well defined.
    for (let j = 0; j < i; j++) if (cabs(csub(p, poles[j])) < 1e-6) return [p[0] - 1e-4 * (i + 1), p[1]];
    return p;
  });
  return ps.map((p, k) => {
    let num = [g, 0], den = [1, 0];
    for (const q of zeros) num = cmul(num, csub(p, q));
    ps.forEach((pj, j) => { if (j !== k) den = cmul(den, csub(p, pj)); });
    return { p, r: cdiv(num, den) };
  });
}

/** h(t) for t ≥ 0 (zero before), real part of the residue sum. */
export function impulseS(t, res) {
  if (t < 0) return 0;
  let re = 0;
  for (const { p, r } of res) re += cmul(r, cexp([p[0] * t, p[1] * t]))[0];
  return re;
}

/** Polynomial coefficients (highest power first) of Π(x − root), real when roots come in pairs. */
export function polyFromRoots(roots) {
  let c = [[1, 0]];
  for (const r of roots) {
    const next = Array.from({ length: c.length + 1 }, () => [0, 0]);
    c.forEach((a, i) => {
      next[i] = cadd(next[i], a);
      next[i + 1] = csub(next[i + 1], cmul(a, r));
    });
    c = next;
  }
  return c.map((a) => a[0]);
}

/**
 * Impulse response h[0..n-1] of H(z) = g Π(1 − zero z⁻¹)/Π(1 − pole z⁻¹),
 * by running the difference equation on an impulse.
 */
export function impulseZ(poles, zeros, n, g = 1) {
  const b = polyFromRoots(zeros).map((v) => v * g); // b0 + b1 z⁻¹ + …
  const a = polyFromRoots(poles); // 1 + a1 z⁻¹ + …
  const x = (k) => (k === 0 ? 1 : 0);
  const y = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let v = 0;
    for (let i = 0; i < b.length; i++) v += b[i] * x(k - i);
    for (let i = 1; i < a.length; i++) if (k - i >= 0) v -= a[i] * y[k - i];
    y[k] = v / a[0];
  }
  return y;
}

/** The z-transform's H(z) in the same pole/zero form, evaluated at z. */
export const Hz = (z, poles, zeros, g = 1) => {
  // g Π(1 − q/z)/Π(1 − p/z) = g z^{P−Q} Π(z − q)/Π(z − p)
  const base = rational(z, poles, zeros, g);
  let zp = [1, 0];
  const d = poles.length - zeros.length;
  for (let i = 0; i < Math.abs(d); i++) zp = d > 0 ? cmul(zp, z) : cdiv(zp, z);
  return cmul(base, zp);
};

/** Stable when every pole is strictly left of the axis (s) or inside the circle (z). */
export const stableS = (poles) => poles.every((p) => p[0] < 0);
export const stableZ = (poles) => poles.every((p) => cabs(p) < 1);

/** The bridge from continuous to discrete time: z = e^{sT}. */
export const sToZ = (s, T) => cexp([s[0] * T, s[1] * T]);

/** The real part of e^{st}: e^{σt} cos(ωt). */
export const expSReal = (s, t) => Math.exp(s[0] * t) * Math.cos(s[1] * t);

/** The real part of zⁿ: rⁿ cos(θ n). */
export const powZReal = (z, n) => cabs(z) ** n * Math.cos(Math.atan2(z[1], z[0]) * n);

/** Frequency response on the unit circle, H(e^{iθ}). */
export const onCircle = (theta, poles, zeros, g = 1) => Hz(cis(theta), poles, zeros, g);

/* ---------- The big picture: example transforms ---------- */

/** sinc(x) = sin(πx)/(πx). */
export const sinc = (x) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

/** |DTFT| of a length-L run of ones: |sin(Lω/2) / sin(ω/2)|. */
export const dirichlet = (w, L) => {
  const d = Math.sin(w / 2);
  return Math.abs(d) < 1e-9 ? L : Math.abs(Math.sin((L * w) / 2) / d);
};

/** Fourier series coefficient size of a ±1 square wave: 4/(πk) for odd k, else 0. */
export const squareCoef = (k) => (k % 2 === 1 ? 4 / (Math.PI * k) : 0);
