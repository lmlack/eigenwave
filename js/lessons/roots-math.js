// DOM-free math for lesson 8.

import { TAU } from "../cmath.js";

/** The N roots of unity, ω^0 … ω^{N-1}, as [re, im]. */
export function rootsOfUnity(N) {
  return Array.from({ length: N }, (_, k) => [Math.cos((TAU * k) / N), Math.sin((TAU * k) / N)]);
}

/**
 * The terms of the inner product ⟨f_j, f_k⟩ = Σ conj(ω^{jn}) ω^{kn}
 * = Σ ω^{(k−j)n}, one [re, im] per n.
 */
export function fourierTerms(N, j, k) {
  return Array.from({ length: N }, (_, n) => {
    const a = (TAU * (k - j) * n) / N;
    return [Math.cos(a), Math.sin(a)];
  });
}
