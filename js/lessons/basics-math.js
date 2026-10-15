// Math for lesson 11 (impulses, steps and exponentials), free of the DOM.

export const delta = (n) => (n === 0 ? 1 : 0);
export const step = (n) => (n >= 0 ? 1 : 0);

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

/**
 * The period of cos(ω n) when ω = (p/q)·π, in samples: the smallest N with
 * ω N a whole number of turns. ω N / 2π = p N / 2q, so N = 2q / gcd(p, 2q).
 * p = 0 is a constant, period 1.
 */
export function periodOf(p, q) {
  if (p === 0) return 1;
  return (2 * q) / gcd(Math.abs(p), 2 * q);
}

/** ω / π as a reduced fraction [p, q], for a slider value counted in 1/den steps. */
export function reduce(p, q) {
  const g = gcd(p, q) || 1;
  return [p / g, q / g];
}
