// Every lesson in order. A lesson without `load` shows on the course map as
// coming soon. Each loader imports js/lessons/<id>.js, which exports mount().

export const PARTS = [
  { title: "Vectors and matrices", from: "Strang, chapters 1–6" },
  { title: "Complex numbers and functions", from: "Strang, chapter 9" },
  { title: "Signals and systems", from: "Oppenheim, chapters 1–2" },
  { title: "Fourier", from: "Oppenheim, chapters 3–8" },
  { title: "The bigger picture", from: "Oppenheim, chapters 9–10" },
];

const L = (id, part, title, ready = false) => ({
  id, part, title,
  load: ready ? () => import(`./lessons/${id}.js`) : null,
});

export const LESSONS = [
  L("vectors", 0, "Vectors and linear combinations", true),
  L("dot", 0, "Dot products and projections", true),
  L("matrices", 0, "A matrix moves space", true),
  L("basis", 0, "Bases and change of basis", true),
  L("orthogonal", 0, "Orthogonal bases", true),
  L("eigen", 0, "Eigenvectors", true),

  L("complex", 1, "Complex numbers are turns", true),
  L("roots", 1, "Roots of unity and complex vectors", true),
  L("functions", 1, "Functions are vectors", true),

  L("signals", 2, "Signals are vectors", true),
  L("basics", 2, "Impulses, steps and exponentials", true),
  L("systems", 2, "Linear and time-invariant", true),
  L("convolution", 2, "Convolution", true),

  L("eigenlti", 3, "Why sines: exponentials are eigenvectors", true),
  L("dft", 3, "The DFT is a change of basis", true),
  L("series", 3, "Fourier series", true),
  L("transform", 3, "From series to transform", true),
  L("windows", 3, "DTFT, DFT and leakage", true),
  L("fft", 3, "The FFT", true),
  L("filtering", 3, "Convolution becomes multiplication", true),
  L("denoise", 3, "Cleaning a signal with the FFT", true),
  L("spectrogram", 3, "Spectrogram and uncertainty", true),
  L("sampling", 3, "Sampling and aliasing", true),
  L("modulation", 3, "Modulation", true),

  L("laplace", 4, "The Laplace transform and the s-plane", true),
  L("ztransform", 4, "The z-transform and the unit circle", true),
  L("bigpicture", 4, "How the transforms fit together", true),
];

LESSONS.forEach((l, i) => (l.n = i + 1));
export const byId = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
