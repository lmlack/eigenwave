// Math for lesson 13 (convolution), free of the DOM.

/**
 * The convolution matrix: multiplying it by x (length nx) gives x * h.
 * Entry (n, k) is h[n − k], so every diagonal is constant (a Toeplitz matrix)
 * and each column is a copy of h moved down one more row.
 */
export function convMatrix(h, nx) {
  const ny = nx + h.length - 1;
  return Array.from({ length: ny }, (_, n) => Array.from({ length: nx }, (_, k) => {
    const i = n - k;
    return i >= 0 && i < h.length ? h[i] : 0;
  }));
}

/** The terms x[k]·h[n − k] that add up to y[n], for k = 0 … nx − 1. */
export function terms(x, h, n) {
  return x.map((xk, k) => {
    const i = n - k;
    return i >= 0 && i < h.length ? xk * h[i] : 0;
  });
}
