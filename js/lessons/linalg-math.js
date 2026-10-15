// 2×2 linear algebra for lessons 2–6, free of the DOM so it can be tested.
// A 2-vector is [x, y]. A 2×2 matrix is [[a, b], [c, d]] (rows).

export const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
export const len2 = (a) => Math.hypot(a[0], a[1]);
/** The angle between a and b, in [0, π]. NaN if either is zero. */
export function angle2(a, b) {
  const n = len2(a) * len2(b);
  if (!(n > 1e-12)) return NaN;
  // atan2 of |cross| and dot stays accurate near 0 and π, where acos doesn't.
  return Math.atan2(Math.abs(a[0] * b[1] - a[1] * b[0]), dot2(a, b));
}
/** The projection of b onto the line through a: (a·b / a·a) a. */
export function project(b, a) {
  const aa = dot2(a, a);
  if (!(aa > 1e-12)) return [0, 0];
  const s = dot2(a, b) / aa;
  return [s * a[0], s * a[1]];
}

/** A times x. */
export const mulMV = (A, x) => [A[0][0] * x[0] + A[0][1] * x[1], A[1][0] * x[0] + A[1][1] * x[1]];
/** A times B. */
export const mulMM = (A, B) => [
  [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
  [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
];
export const det2 = (A) => A[0][0] * A[1][1] - A[0][1] * A[1][0];
/** The matrix whose columns are u and v. */
export const fromCols = (u, v) => [[u[0], v[0]], [u[1], v[1]]];
/** The inverse, or null when the matrix is singular (or nearly). */
export function inv2(A) {
  const d = det2(A);
  const scale = Math.max(...A.flat().map(Math.abs), 1e-12);
  if (Math.abs(d) < 1e-9 * scale * scale) return null;
  return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
}
/** Solve A c = x for c, or null if A is singular. */
export function solve2(A, x) {
  const I = inv2(A);
  return I ? mulMV(I, x) : null;
}

/**
 * Eigenvalues of a 2×2 matrix from the characteristic polynomial
 * λ² − (tr A) λ + det A = 0. Returns { real: true, values, vectors } with
 * unit eigenvectors, or { real: false, values: [[re, im], [re, -im]] }.
 */
export function eig2(A) {
  const tr = A[0][0] + A[1][1], d = det2(A);
  const disc = tr * tr - 4 * d;
  if (disc < -1e-12) {
    const im = Math.sqrt(-disc) / 2;
    return { real: false, values: [[tr / 2, im], [tr / 2, -im]] };
  }
  const s = Math.sqrt(Math.max(0, disc));
  const l1 = (tr + s) / 2, l2 = (tr - s) / 2;
  const vecFor = (l) => {
    // (A − λI) v = 0: take a nonzero row and go perpendicular to it.
    const r1 = [A[0][0] - l, A[0][1]], r2 = [A[1][0], A[1][1] - l];
    const r = len2(r1) >= len2(r2) ? r1 : r2;
    if (len2(r) < 1e-9) return null; // A = λI: every direction works
    const v = [-r[1], r[0]];
    const n = len2(v);
    return [v[0] / n, v[1] / n];
  };
  let v1 = vecFor(l1), v2 = vecFor(l2);
  if (!v1 && !v2) { v1 = [1, 0]; v2 = [0, 1]; }
  else if (Math.abs(l1 - l2) < 1e-9) v2 = v1; // a repeated eigenvalue with one direction
  return { real: true, values: [l1, l2], vectors: [v1, v2] };
}

/** Eigenvalues of the symmetric [[a, e], [e, −a]]: ±√(a² + e²). */
export const avoidedPair = (a, e) => [Math.sqrt(a * a + e * e), -Math.sqrt(a * a + e * e)];

/* ---------- Length-N vectors ---------- */

export const dotN = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const normN = (a) => Math.sqrt(dotN(a, a));

/**
 * The 8-point Haar basis, orthonormal: an average, then differences at
 * coarser and finer scales. Rows are the basis signals.
 */
export function haar8() {
  const raw = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, -1, -1, -1, -1],
    [1, 1, -1, -1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, -1, -1],
    [1, -1, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, -1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, -1, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, -1],
  ];
  return raw.map((r) => { const n = normN(r); return r.map((v) => v / n); });
}

/** The 8-point cosine basis (DCT-II, orthonormal): slow waves to fast ones. */
export function cosine8() {
  const N = 8;
  return Array.from({ length: N }, (_, k) => {
    const s = k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
    return Array.from({ length: N }, (_, n) => s * Math.cos((Math.PI * (n + 0.5) * k) / N));
  });
}

/** Coefficients in an orthonormal basis (rows): just dot products. */
export const coeffs = (basis, x) => basis.map((b) => dotN(b, x));
/** Rebuild from the first k coefficients. */
export function rebuild(basis, c, k = basis.length) {
  const out = new Array(basis[0].length).fill(0);
  for (let i = 0; i < k; i++) for (let n = 0; n < out.length; n++) out[n] += c[i] * basis[i][n];
  return out;
}
