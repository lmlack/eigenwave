import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Hz, cexp, dirichlet, impulseS, impulseZ, onCircle, polyFromRoots, rational, residues, sToZ, stableS, stableZ, withConjugates,
} from "../js/lessons/transforms-math.js";

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test("one real pole: H(s) = 1/(s + a) has h(t) = e^{-at}", () => {
  const res = residues([[-2, 0]], []);
  for (const t of [0, 0.3, 1, 2]) close(impulseS(t, res), Math.exp(-2 * t));
  close(impulseS(-1, res), 0);
});

test("a pole pair gives a damped sine: 1/((s+σ)² + ω²) → e^{-σt} sin(ωt)/ω", () => {
  const s = 0.5, w = 3;
  const res = residues(withConjugates([[-s, w]]), []);
  for (const t of [0.1, 0.7, 1.9]) close(impulseS(t, res), (Math.exp(-s * t) * Math.sin(w * t)) / w);
});

test("residue sum matches a numerical inverse check: H(s) at a point", () => {
  // ∫ h(t) e^{-st} dt should equal H(s) for s right of every pole.
  const poles = withConjugates([[-1, 2]]), zeros = [[-0.5, 0]];
  const res = residues(poles, zeros);
  const s = [0.5, 1];
  let re = 0, im = 0;
  const dt = 1e-3;
  for (let t = 0; t < 30; t += dt) {
    const h = impulseS(t + dt / 2, res);
    const e = cexp([-s[0] * (t + dt / 2), -s[1] * (t + dt / 2)]);
    re += h * e[0] * dt; im += h * e[1] * dt;
  }
  const H = rational(s, poles, zeros);
  close(re, H[0], 1e-4); close(im, H[1], 1e-4);
});

test("polyFromRoots of a conjugate pair is real", () => {
  const c = polyFromRoots(withConjugates([[0.5, 0.5]]));
  assert.deepEqual(c.map((v) => +v.toFixed(9)), [1, -1, 0.5]);
});

test("z: one pole at a gives h[n] = aⁿ, and the DTFT is H on the unit circle", () => {
  const h = impulseZ([[0.8, 0]], [], 10);
  for (let n = 0; n < 10; n++) close(h[n], 0.8 ** n);
  // H(e^{iθ}) = 1/(1 − 0.8 e^{-iθ}) = Σ 0.8ⁿ e^{-iθn}
  const th = 0.7;
  const H = onCircle(th, [[0.8, 0]], []);
  let re = 0, im = 0;
  for (let n = 0; n < 200; n++) { re += 0.8 ** n * Math.cos(-th * n); im += 0.8 ** n * Math.sin(-th * n); }
  close(H[0], re); close(H[1], im);
});

test("Hz matches the sum of h[n] z^{-n} inside the region of convergence", () => {
  const poles = withConjugates([[0.6, 0.5]]), zeros = [[-1, 0]];
  const h = impulseZ(poles, zeros, 400);
  const z = [1.2, 0.3];
  let acc = [0, 0];
  let zinv = [1, 0];
  const zi = [z[0] / (z[0] ** 2 + z[1] ** 2), -z[1] / (z[0] ** 2 + z[1] ** 2)];
  for (let n = 0; n < 400; n++) {
    acc = [acc[0] + h[n] * zinv[0], acc[1] + h[n] * zinv[1]];
    zinv = [zinv[0] * zi[0] - zinv[1] * zi[1], zinv[0] * zi[1] + zinv[1] * zi[0]];
  }
  const H = Hz(z, poles, zeros);
  close(acc[0], H[0], 1e-6); close(acc[1], H[1], 1e-6);
});

test("z = e^{sT}: left half to inside, iω axis to the circle, 2π/T apart lands on the same z", () => {
  const T = 0.5;
  assert.ok(Math.hypot(...sToZ([-1, 3], T)) < 1);
  close(Math.hypot(...sToZ([0, 3], T)), 1);
  const a = sToZ([-0.3, 1], T), b = sToZ([-0.3, 1 + (2 * Math.PI) / T], T);
  close(a[0], b[0]); close(a[1], b[1]);
});

test("stability tests", () => {
  assert.equal(stableS([[-0.1, 2], [-0.1, -2]]), true);
  assert.equal(stableS([[0.1, 0]]), false);
  assert.equal(stableZ([[0.9, 0.3]]), true);
  assert.equal(stableZ([[0.9, 0.5]]), false);
});

test("Dirichlet kernel peaks at L", () => {
  close(dirichlet(0, 5), 5);
  close(dirichlet((2 * Math.PI) / 5, 5), 0, 1e-9);
});
