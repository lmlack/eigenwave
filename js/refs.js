// Sources. Full citations live here once; each lesson lists the parts of
// them it draws on. main.js shows a lesson's list at the end of the lesson,
// and every citation together on the References page.
//
// Section numbers are given only where they were checked against the book's
// own table of contents (Brunton & Kutz, from Cambridge's front matter).
// Elsewhere the citation names the chapter, with the topic in brackets.

export const SOURCES = {
  strang: {
    cite: "Strang, G. (2023). <i>Introduction to Linear Algebra</i> (6th ed.). Wellesley-Cambridge Press. ISBN 978-1-7331466-7-8.",
    url: "https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html",
    short: "Strang (2023)",
  },
  oppenheim: {
    cite: "Oppenheim, A. V., Willsky, A. S., &amp; Nawab, S. H. (1997). <i>Signals &amp; Systems</i> (2nd ed.). Prentice Hall. ISBN 0-13-814757-4.",
    url: "https://archive.org/details/signalssystems0000oppe",
    short: "Oppenheim, Willsky &amp; Nawab (1997)",
  },
  dtsp: {
    cite: "Oppenheim, A. V., &amp; Schafer, R. W. (2010). <i>Discrete-Time Signal Processing</i> (3rd ed.). Pearson. ISBN 978-0-13-198842-2.",
    short: "Oppenheim &amp; Schafer (2010)",
  },
  brunton: {
    cite: "Brunton, S. L., &amp; Kutz, J. N. (2022). <i>Data-Driven Science and Engineering: Machine Learning, Dynamical Systems, and Control</i> (2nd ed.). Cambridge University Press. https://doi.org/10.1017/9781009089517",
    url: "https://doi.org/10.1017/9781009089517",
    short: "Brunton &amp; Kutz (2022)",
  },
  bruntonVideos: {
    cite: "Brunton, S. L. (n.d.). <i>Fourier Analysis</i> and <i>Control Bootcamp</i> [Video lecture series]. YouTube.",
    url: "https://www.youtube.com/@Eigensteve/courses",
    short: "Brunton, video lectures",
  },
  cooley: {
    cite: "Cooley, J. W., &amp; Tukey, J. W. (1965). An algorithm for the machine calculation of complex Fourier series. <i>Mathematics of Computation, 19</i>(90), 297–301. https://doi.org/10.1090/S0025-5718-1965-0178586-1",
    url: "https://doi.org/10.1090/S0025-5718-1965-0178586-1",
    short: "Cooley &amp; Tukey (1965)",
  },
  shannon: {
    cite: "Shannon, C. E. (1949). Communication in the presence of noise. <i>Proceedings of the IRE, 37</i>(1), 10–21. https://doi.org/10.1109/JRPROC.1949.232969",
    url: "https://doi.org/10.1109/JRPROC.1949.232969",
    short: "Shannon (1949)",
  },
  gabor: {
    cite: "Gabor, D. (1946). Theory of communication. <i>Journal of the Institution of Electrical Engineers, Part III: Radio and Communication Engineering, 93</i>(26), 429–457.",
    short: "Gabor (1946)",
  },
};

/** For each lesson: [source key, where in it]. */
export const LESSON_SOURCES = {
  vectors: [["strang", "ch. 1 (vectors and linear combinations)"]],
  dot: [["strang", "ch. 1 (lengths and dot products)"], ["strang", "ch. 4 (projections)"]],
  matrices: [["strang", "ch. 1 (matrices)"], ["strang", "ch. 8 (linear transformations)"]],
  basis: [["strang", "ch. 3 (bases and dimension)"], ["strang", "ch. 8 (change of basis)"]],
  orthogonal: [["strang", "ch. 4 (orthogonality, projections, orthonormal bases)"]],
  eigen: [["strang", "ch. 6, starting with §6.1, Introduction to Eigenvalues"]],

  complex: [["strang", "ch. 6 (complex numbers, vectors and matrices)"], ["oppenheim", "ch. 1 (complex exponential signals)"]],
  roots: [["strang", "ch. 6 (complex numbers, vectors and matrices)"], ["dtsp", "ch. 8 (the discrete Fourier transform)"]],
  functions: [["brunton", "§2.1, Fourier Series and Fourier Transforms"], ["bruntonVideos", "Fourier Analysis series (inner products of functions)"]],

  signals: [["oppenheim", "ch. 1 (signals and transformations of time)"]],
  basics: [["oppenheim", "ch. 1 (exponential and sinusoidal signals; the unit impulse and unit step)"]],
  systems: [["oppenheim", "ch. 1 (basic system properties)"]],
  convolution: [["oppenheim", "ch. 2 (the convolution sum and integral)"]],

  eigenlti: [["oppenheim", "ch. 3 (the response of LTI systems to complex exponentials)"], ["strang", "ch. 6 (eigenvalues and eigenvectors)"]],
  dft: [["dtsp", "ch. 8 (the discrete Fourier transform)"], ["brunton", "§2.2, Discrete Fourier Transform (DFT) and Fast Fourier Transform (FFT)"]],
  series: [["oppenheim", "ch. 3 (Fourier series of periodic signals; convergence and the Gibbs phenomenon)"], ["brunton", "§2.1, Fourier Series and Fourier Transforms"], ["bruntonVideos", "Fourier Analysis series"]],
  transform: [["oppenheim", "ch. 4 (the continuous-time Fourier transform)"], ["brunton", "§2.1, Fourier Series and Fourier Transforms"]],
  windows: [["oppenheim", "ch. 5 (the discrete-time Fourier transform)"], ["dtsp", "ch. 10 (Fourier analysis of signals using the DFT; windows)"]],
  fft: [["dtsp", "ch. 9 (computation of the DFT)"], ["brunton", "§2.2, Discrete Fourier Transform (DFT) and Fast Fourier Transform (FFT)"], ["cooley", "the original FFT paper"]],
  filtering: [["oppenheim", "ch. 4 (the convolution property) and ch. 6 (frequency-selective filters)"]],
  denoise: [["brunton", "§2.2, Discrete Fourier Transform (DFT) and Fast Fourier Transform (FFT), the denoising example"], ["bruntonVideos", "Fourier Analysis series"]],
  spectrogram: [["brunton", "§2.4, Gabor Transform and the Spectrogram"], ["dtsp", "ch. 10 (the time-dependent Fourier transform)"], ["gabor", "time–frequency uncertainty"]],
  sampling: [["oppenheim", "ch. 7 (sampling, aliasing and reconstruction)"], ["shannon", "the sampling theorem"]],
  modulation: [["oppenheim", "ch. 8 (amplitude modulation and frequency-division multiplexing)"]],

  laplace: [["oppenheim", "ch. 9 (the Laplace transform, region of convergence, poles and zeros)"], ["brunton", "§2.5, Laplace Transform"]],
  ztransform: [["oppenheim", "ch. 10 (the z-transform)"], ["dtsp", "ch. 3 (the z-transform)"]],
  bigpicture: [["oppenheim", "chs. 3–5, 9 and 10"], ["brunton", "ch. 2, Fourier and Wavelet Transforms"]],
};

/** One source line: "Short, where." linking to the full entry on the References page. */
export function sourceLine(key, where) {
  const s = SOURCES[key];
  return `${s.short}, ${where}.`;
}
