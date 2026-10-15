// The math behind the figures, free of the DOM so it can be tested: complex
// numbers, the DFT and its inverse, a radix-2 FFT, convolution (linear and
// circular), circulant matrices and windows.
//
// A complex number is [re, im]. A complex signal is { re: Float64Array, im: Float64Array }.

export const TAU = 2 * Math.PI;

/* ---------- Complex numbers ---------- */

export const C = (re, im = 0) => [re, im];
export const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const cdiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
export const conj = (a) => [a[0], -a[1]];
export const cabs = (a) => Math.hypot(a[0], a[1]);
export const carg = (a) => Math.atan2(a[1], a[0]);
/** e^{iθ}: the point at angle θ on the unit circle. */
export const cis = (t) => [Math.cos(t), Math.sin(t)];
export const cscale = (a, s) => [a[0] * s, a[1] * s];
export const polar = (r, t) => [r * Math.cos(t), r * Math.sin(t)];

/* ---------- Signals ---------- */

/** A complex signal of length n, all zero, or from real values. */
export function signal(n, re = null, im = null) {
  const s = { re: new Float64Array(n), im: new Float64Array(n) };
  if (re) s.re.set(re);
  if (im) s.im.set(im);
  return s;
}
const asSignal = (x) => (x.re ? x : signal(x.length, x));

/**
 * The DFT, straight from the definition: X[k] = Σ x[n] e^{-2πi kn/N}.
 * O(N²), and fine for any N. Use fft() for long powers of two.
 */
export function dft(x) {
  const s = asSignal(x);
  const N = s.re.length;
  const out = signal(N);
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const t = (-TAU * k * n) / N;
      const c = Math.cos(t), si = Math.sin(t);
      re += s.re[n] * c - s.im[n] * si;
      im += s.re[n] * si + s.im[n] * c;
    }
    out.re[k] = re; out.im[k] = im;
  }
  return out;
}

/** The inverse DFT: x[n] = (1/N) Σ X[k] e^{+2πi kn/N}. */
export function idft(X) {
  const s = asSignal(X);
  const N = s.re.length;
  const conjIn = signal(N, s.re, s.im.map((v) => -v));
  const y = dft(conjIn);
  for (let i = 0; i < N; i++) { y.re[i] /= N; y.im[i] = -y.im[i] / N; }
  return y;
}

export const isPow2 = (n) => n > 0 && (n & (n - 1)) === 0;
export const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(Math.max(1, n)));

/**
 * Radix-2 decimation-in-time FFT, in place on a copy. Same result as dft()
 * for power-of-two lengths, and falls back to dft() otherwise.
 * Pass inverse = true for the inverse transform (with the 1/N).
 */
export function fft(x, inverse = false) {
  const s0 = asSignal(x);
  const N = s0.re.length;
  if (!isPow2(N)) return inverse ? idft(s0) : dft(s0);
  const re = Float64Array.from(s0.re), im = Float64Array.from(s0.im);
  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (sign * TAU) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
  if (inverse) for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
  return { re, im };
}

/** Magnitude and phase of each entry. */
export const mag = (X) => Array.from(X.re, (r, i) => Math.hypot(r, X.im[i]));
export const phase = (X) => Array.from(X.re, (r, i) => Math.atan2(X.im[i], r));

/** Frequency index k as a signed frequency: 0..N/2, then negative. */
export const signedBin = (k, N) => (k <= N / 2 ? k : k - N);

/* ---------- Convolution ---------- */

/** Linear convolution of real sequences: length a.length + b.length - 1. */
export function convolve(a, b) {
  const out = new Float64Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}

/** Circular convolution of two real sequences of the same length N. */
export function circConvolve(a, b) {
  const N = a.length;
  const out = new Float64Array(N);
  for (let n = 0; n < N; n++) for (let m = 0; m < N; m++) out[n] += a[m] * b[(((n - m) % N) + N) % N];
  return out;
}

/**
 * The circulant matrix whose first column is c: every column is the one
 * before it shifted down by one, wrapping around. Multiplying by it is
 * circular convolution with c.
 */
export function circulant(c) {
  const N = c.length;
  return Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => c[(((i - j) % N) + N) % N]));
}

/** Matrix times vector, real. */
export const matVec = (A, v) => A.map((row) => row.reduce((s, a, j) => s + a * v[j], 0));

/* ---------- Windows ---------- */

export const WINDOWS = {
  rect: (n, N) => 1,
  hann: (n, N) => 0.5 - 0.5 * Math.cos((TAU * n) / (N - 1)),
  hamming: (n, N) => 0.54 - 0.46 * Math.cos((TAU * n) / (N - 1)),
  blackman: (n, N) => 0.42 - 0.5 * Math.cos((TAU * n) / (N - 1)) + 0.08 * Math.cos((2 * TAU * n) / (N - 1)),
};
export const windowed = (x, name) => Array.from(x, (v, n) => v * WINDOWS[name](n, x.length));

/* ---------- Small helpers ---------- */

/** A seeded random number generator, so figures with noise look the same every visit. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal noise from a uniform generator (Box–Muller). */
export function gaussian(rand) {
  return () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(TAU * rand());
}

export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const norm = (a) => Math.sqrt(dot(a, a));
