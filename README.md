# eigenwave

Interactive lessons from linear algebra to the Fourier transform. Every page has something to drag, slide or play, and the math updates live. No build step, no accounts, nothing uploaded.

Live at **https://eigenwave.gwark.dev**.

1. **Vectors and matrices**: linear combinations, dot products and projections, a matrix bending a house, change of basis, orthogonal bases, eigenvectors.
2. **Complex numbers and functions**: complex numbers as turns, roots of unity and Fourier vectors, functions as vectors.
3. **Signals and systems**: signals as vectors, impulses and exponentials, linearity and time invariance, convolution.
4. **Fourier**: why sines, the DFT as a change of basis, Fourier series, from series to transform, leakage and windows, the FFT, filtering, denoising, the spectrogram, sampling and aliasing, modulation.
5. **The bigger picture**: the Laplace transform and the s-plane, the z-transform and the unit circle, and how all the transforms fit together.

Some lessons have Listen buttons: hear harmonics stack up, a tone alias, or a pole ring.

The order follows Strang's *Introduction to Linear Algebra* and Oppenheim, Willsky and Nawab's *Signals & Systems*, with ideas from Brunton and Kutz's *Data-Driven Science and Engineering* and Steve Brunton's lectures. Full citations are on the site's References page. The explanations, figures and code here are this project's own.

## Run

```sh
npm run serve        # http://localhost:5190, caching off
```

Any static file server works. It has to be served over http, not opened as a file, because the page uses ES modules.

## Test

```sh
npm test             # the math behind every figure
```

## License

- **Code** (`js/`, `css/`, `scripts/`, `tests/`, and the page itself) is MIT: see `LICENSE`.
- **Writing** (the lesson text) is CC BY 4.0: see `LICENSE-CC-BY-4.0`.
- Third-party components keep their own licenses: see `THIRD-PARTY.md`.
