import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cdiv, cis, cmul, circConvolve, circulant, convolve, dft, fft, idft, matVec, mulberry32, signal,
} from "../js/cmath.js";

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);
const rand = mulberry32(3);
const randomSignal = (N) => signal(N, Array.from({ length: N }, () => rand() - 0.5), Array.from({ length: N }, () => rand() - 0.5));

test("complex multiply and divide undo each other", () => {
  const a = [1.5, -2], b = [0.3, 0.7];
  const q = cdiv(cmul(a, b), b);
  close(q[0], a[0]); close(q[1], a[1]);
});

test("multiplying by e^{iθ} turns by θ and keeps the length", () => {
  const z = cmul([2, 0], cis(Math.PI / 3));
  close(Math.hypot(...z), 2);
  close(Math.atan2(z[1], z[0]), Math.PI / 3);
});

test("the DFT of an impulse is flat, and of a constant is one spike", () => {
  const X = dft([1, 0, 0, 0, 0, 0]);
  for (let k = 0; k < 6; k++) { close(X.re[k], 1); close(X.im[k], 0); }
  const Y = dft([1, 1, 1, 1, 1]);
  close(Y.re[0], 5);
  for (let k = 1; k < 5; k++) close(Math.hypot(Y.re[k], Y.im[k]), 0);
});

test("a cosine at bin 3 lands in bins 3 and N-3", () => {
  const N = 16;
  const X = dft(Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * 3 * n) / N)));
  close(X.re[3], N / 2); close(X.re[N - 3], N / 2);
  for (const k of [0, 1, 2, 4, 8]) close(Math.hypot(X.re[k], X.im[k]), 0);
});

test("idft undoes dft, any length", () => {
  for (const N of [1, 5, 12, 17]) {
    const x = randomSignal(N);
    const y = idft(dft(x));
    for (let i = 0; i < N; i++) { close(y.re[i], x.re[i]); close(y.im[i], x.im[i]); }
  }
});

test("fft matches dft, and its inverse undoes it", () => {
  for (const N of [1, 2, 8, 64, 256]) {
    const x = randomSignal(N);
    const A = dft(x), B = fft(x);
    for (let i = 0; i < N; i++) { close(A.re[i], B.re[i], 1e-8); close(A.im[i], B.im[i], 1e-8); }
    const y = fft(B, true);
    for (let i = 0; i < N; i++) { close(y.re[i], x.re[i], 1e-9); close(y.im[i], x.im[i], 1e-9); }
  }
  // Not a power of two: falls back to the plain DFT.
  const x = randomSignal(12);
  const A = dft(x), B = fft(x);
  for (let i = 0; i < 12; i++) close(A.re[i], B.re[i]);
});

test("Parseval: energy is the same in both domains (with the 1/N)", () => {
  const x = randomSignal(32);
  const X = fft(x);
  let et = 0, ef = 0;
  for (let i = 0; i < 32; i++) { et += x.re[i] ** 2 + x.im[i] ** 2; ef += X.re[i] ** 2 + X.im[i] ** 2; }
  close(et, ef / 32);
});

test("convolution: lengths add, and a delta copies", () => {
  const y = convolve([1, 2, 3], [0, 1]);
  assert.deepEqual(Array.from(y), [0, 1, 2, 3]);
  assert.deepEqual(Array.from(convolve([1, 1], [1, 1])), [1, 2, 1]);
});

test("circular convolution is multiplication by a circulant matrix", () => {
  const h = [1, 2, 0, -1, 0.5], x = [3, -1, 2, 0, 1];
  const a = circConvolve(h, x), b = matVec(circulant(h), x);
  for (let i = 0; i < 5; i++) close(a[i], b[i]);
});

test("convolution theorem: DFT of circular convolution is the product of DFTs", () => {
  const N = 8;
  const h = Array.from({ length: N }, () => rand()), x = Array.from({ length: N }, () => rand());
  const Y = dft(circConvolve(h, x)), H = dft(h), X = dft(x);
  for (let k = 0; k < N; k++) {
    const p = cmul([H.re[k], H.im[k]], [X.re[k], X.im[k]]);
    close(Y.re[k], p[0]); close(Y.im[k], p[1]);
  }
});

test("Fourier vectors are eigenvectors of every circulant matrix", () => {
  const N = 6, c = [2, -1, 0, 0.5, 0, 1];
  const A = circulant(c);
  const lam = dft(c);
  for (let k = 0; k < N; k++) {
    const vr = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * k * n) / N));
    const vi = Array.from({ length: N }, (_, n) => Math.sin((2 * Math.PI * k * n) / N));
    const Ar = matVec(A, vr), Ai = matVec(A, vi);
    // A v = λ v with λ = (DFT of c) at k.
    for (let n = 0; n < N; n++) {
      const want = cmul([lam.re[k], lam.im[k]], [vr[n], vi[n]]);
      close(Ar[n], want[0]); close(Ai[n], want[1]);
    }
  }
});
