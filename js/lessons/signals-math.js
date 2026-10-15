// DOM-free math for lesson 10. A discrete signal is a function of a whole
// number n (zero wherever it isn't defined). Operations return new functions.

/** A signal from values on n = start, start + 1, …, zero elsewhere. */
export function fromArray(values, start) {
  return (n) => (Number.isInteger(n) && n >= start && n < start + values.length ? values[n - start] : 0);
}

export const shift = (x, n0) => (n) => x(n - n0);          // y[n] = x[n − n0]
export const flip = (x) => (n) => x(-n);                    // y[n] = x[−n]
export const amplify = (x, A) => (n) => A * x(n);           // y[n] = A x[n]
export const downsample = (x, M) => (n) => x(M * n);        // y[n] = x[M n]
export const upsample = (x, L) => (n) => (n % L === 0 ? x(n / L) : 0); // y[n] = x[n / L] or 0

/** The even and odd parts: x = x_e + x_o, x_e[−n] = x_e[n], x_o[−n] = −x_o[n]. */
export const evenPart = (x) => (n) => (x(n) + x(-n)) / 2;
export const oddPart = (x) => (n) => (x(n) - x(-n)) / 2;

/** Energy Σ |x[n]|² over n = a..b. */
export function energy(x, a, b) {
  let e = 0;
  for (let n = a; n <= b; n++) e += x(n) ** 2;
  return e;
}

/* ---------- Continuous time ---------- */

/** The lesson's pulse: a ramp up on [0, 1], a shelf at 1/2 on [1, 2], zero elsewhere. */
export const pulse = (t) => (t >= 0 && t < 1 ? t : t >= 1 && t < 2 ? 0.5 : 0);

/** x(at + b): shift by b first, then scale time by a. */
export const timeTransform = (x, a, b) => (t) => x(a * t + b);
/** The common mistake: scale first, then shift, which gives x(a(t + b)). */
export const wrongOrder = (x, a, b) => (t) => x(a * (t + b));
