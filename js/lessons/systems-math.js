// Math for lesson 12 (linear and time-invariant), free of the DOM.
//
// A signal is a function n → value (zero outside where it's defined). A
// system takes a signal and returns a signal, so systems can look at any
// sample of the input: the past, the future, or x[2n].

/** A signal from an array of values starting at n = start; zero elsewhere. */
export const fromArray = (vals, start = 0) => (n) => (Number.isInteger(n) && n >= start && n < start + vals.length ? vals[n - start] : 0);

export const scaleAdd = (a, x1, b, x2) => (n) => a * x1(n) + b * x2(n);
export const shift = (x, n0) => (n) => x(n - n0);

const LOW = -40; // the accumulator sums from here; every test signal is zero before it

export const SYSTEMS = [
  {
    id: "gain", name: "y = 2x", tex: "y[n] = 2\\,x[n]",
    f: (x) => (n) => 2 * x(n),
    linear: true, ti: true, causal: true, memoryless: true, stable: true,
    why: {
      linear: "Doubling a sum is the sum of the doubles.",
      ti: "The rule is the same at every n.",
      causal: "It only uses x[n], right now.",
      memoryless: "Each output depends only on the same instant.",
      stable: "|y| ≤ 2·|x|, so a bounded input gives a bounded output.",
    },
  },
  {
    id: "square", name: "y = x²", tex: "y[n] = x[n]^2",
    f: (x) => (n) => x(n) ** 2,
    linear: false, ti: true, causal: true, memoryless: true, stable: true,
    why: {
      linear: "(x₁ + x₂)² isn't x₁² + x₂²: the cross term 2x₁x₂ is extra. Doubling the input quadruples the output.",
      ti: "The rule is the same at every n.",
      causal: "It only uses x[n].",
      memoryless: "Each output depends only on the same instant.",
      stable: "A bounded x gives a bounded x².",
    },
  },
  {
    id: "offset", name: "y = x + 1", tex: "y[n] = x[n] + 1",
    f: (x) => (n) => x(n) + 1,
    linear: false, ti: true, causal: true, memoryless: true, stable: true,
    why: {
      linear: "Zero in doesn't give zero out, so it can't be linear: adding two inputs adds the 1 only once, but adding two outputs adds it twice.",
      ti: "The rule is the same at every n.",
      causal: "It only uses x[n].",
      memoryless: "Each output depends only on the same instant.",
      stable: "|y| ≤ |x| + 1.",
    },
  },
  {
    id: "delay", name: "Delay by 2", tex: "y[n] = x[n-2]",
    f: (x) => (n) => x(n - 2),
    linear: true, ti: true, causal: true, memoryless: false, stable: true,
    why: {
      linear: "Delaying a sum delays each part.",
      ti: "Shifting before or after delaying comes to the same thing.",
      causal: "It uses x from 2 samples ago, never the future.",
      memoryless: "It has to remember the last 2 samples.",
      stable: "The output is the input, later. Same size.",
    },
  },
  {
    id: "advance", name: "Look ahead 1", tex: "y[n] = x[n+1]",
    f: (x) => (n) => x(n + 1),
    linear: true, ti: true, causal: false, memoryless: false, stable: true,
    why: {
      linear: "Advancing a sum advances each part.",
      ti: "Shifting before or after comes to the same thing.",
      causal: "It needs x[n + 1], the next sample, before it's happened.",
      memoryless: "It uses a sample other than x[n].",
      stable: "Same size as the input.",
    },
  },
  {
    id: "average", name: "Average of the last 3", tex: "y[n] = \\tfrac{1}{3}\\big(x[n] + x[n-1] + x[n-2]\\big)",
    f: (x) => (n) => (x(n) + x(n - 1) + x(n - 2)) / 3,
    linear: true, ti: true, causal: true, memoryless: false, stable: true,
    why: {
      linear: "An average of sums is the sum of averages.",
      ti: "It averages the same window at every n.",
      causal: "It uses now and the last two samples.",
      memoryless: "It remembers two past samples.",
      stable: "An average is never bigger than the largest value in it.",
    },
  },
  {
    id: "accumulate", name: "Running sum", tex: "y[n] = \\sum_{k=-\\infty}^{n} x[k]",
    f: (x) => (n) => { let s = 0; for (let k = LOW; k <= n; k++) s += x(k); return s; },
    linear: true, ti: true, causal: true, memoryless: false, stable: false,
    why: {
      linear: "Summing a sum is the sum of the sums.",
      ti: "It sums up to the current n, whatever n is.",
      causal: "It only adds up the past and present.",
      memoryless: "It remembers everything so far.",
      stable: "Feed in a step, which is bounded, and the output climbs forever.",
    },
  },
  {
    id: "ramp", name: "y = n·x", tex: "y[n] = n\\,x[n]",
    f: (x) => (n) => n * x(n),
    linear: true, ti: false, causal: true, memoryless: true, stable: false,
    why: {
      linear: "n(x₁ + x₂) = n x₁ + n x₂.",
      ti: "The gain is n, so it depends on when the input arrives. Shift the input and it gets a different gain.",
      causal: "It only uses x[n].",
      memoryless: "Each output depends only on the same instant.",
      stable: "A constant input gives n·c, which grows forever.",
    },
  },
  {
    id: "compress", name: "y = x[2n]", tex: "y[n] = x[2n]",
    f: (x) => (n) => x(2 * n),
    linear: true, ti: false, causal: false, memoryless: false, stable: true,
    why: {
      linear: "Picking samples out of a sum picks them out of each part.",
      ti: "It squeezes time in half. Shift the input by 2 and the output moves by only 1; shift it by 1 and it keeps the other half of the samples.",
      causal: "y[3] needs x[6], three samples in the future.",
      memoryless: "y[n] uses x at 2n, a different time.",
      stable: "It only picks existing samples, so it's never bigger than the input.",
    },
  },
];

/** Largest gap between T(a x1 + b x2) and a T(x1) + b T(x2) over the n range. */
export function linearityGap(sys, x1, x2, a, b, ns) {
  const left = sys.f(scaleAdd(a, x1, b, x2));
  const y1 = sys.f(x1), y2 = sys.f(x2);
  return Math.max(...ns.map((n) => Math.abs(left(n) - (a * y1(n) + b * y2(n)))));
}

/** Largest gap between T(x shifted by n0) and T(x) shifted by n0. */
export function shiftGap(sys, x, n0, ns) {
  const first = sys.f(shift(x, n0));
  const after = shift(sys.f(x), n0);
  return Math.max(...ns.map((n) => Math.abs(first(n) - after(n))));
}
