// A heatmap of |H| over a plane (the s-plane or the z-plane), painted into
// an offscreen canvas and stretched over a Plot's box. Colors come from the
// theme: low is the panel color, then blue, orange and gold for the peaks.
// Used by the Laplace and z-transform lessons.

const cache = new WeakMap();

function rgb(s) {
  if (s.startsWith("#")) {
    const h = s.length === 4 ? s.slice(1).split("").map((d) => d + d).join("") : s.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const m = s.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}

/**
 * Paint log|f(x, y)| over the plot's current view at res × res cells, with a
 * `range` dB span below the brightest cell (capped at `top` dB above 0).
 * f returns a magnitude. Call from inside a Plot's draw callback.
 */
export function heatmap(p, f, { res = 110, range = 40 } = {}) {
  let off = cache.get(p);
  if (!off) { off = document.createElement("canvas"); cache.set(p, off); }
  const W = res, H = Math.max(20, Math.round((res * (p.h - p.pad.t - p.pad.b)) / Math.max(1, p.w - p.pad.l - p.pad.r)));
  off.width = W; off.height = H;
  const ctx = off.getContext("2d");
  const img = ctx.createImageData(W, H);
  const db = new Float64Array(W * H);
  let max = -Infinity;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = p.vx0 + ((i + 0.5) / W) * (p.vx1 - p.vx0);
    const y = p.vy1 - ((j + 0.5) / H) * (p.vy1 - p.vy0);
    const m = f(x, y);
    const v = 20 * Math.log10(Math.max(m, 1e-12));
    db[j * W + i] = v;
    if (Number.isFinite(v) && v > max) max = v;
  }
  const stops = [rgb(p.c.panel), rgb(p.c.blue), rgb(p.c.accent), rgb(p.c.gold)];
  const floor = max - range;
  for (let k = 0; k < W * H; k++) {
    // A sample right on a pole is infinite (or 0/0): paint it as the peak.
    const d = Number.isFinite(db[k]) ? db[k] : db[k] < 0 ? floor : max;
    const u = Number.isFinite(floor) ? Math.max(0, Math.min(1, (d - floor) / range)) : 0;
    const pos = u * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(pos)), a = pos - i;
    const c = stops[i].map((v, n) => v + (stops[i + 1][n] - v) * a);
    img.data.set([c[0], c[1], c[2], 255], k * 4);
  }
  ctx.putImageData(img, 0, 0);
  p.ctx.save();
  p.ctx.imageSmoothingEnabled = true;
  p.ctx.globalAlpha = 0.85;
  p.ctx.drawImage(off, p.pad.l, p.pad.t, p.w - p.pad.l - p.pad.r, p.h - p.pad.t - p.pad.b);
  p.ctx.restore();
}

/** An × marker for a pole, in pixels around a world point. */
export function poleMark(p, x, y, color, size = 7) {
  const X = p.X(x), Y = p.Y(y);
  p.ctx.save();
  p.ctx.strokeStyle = color; p.ctx.lineWidth = 2.5; p.ctx.lineCap = "round";
  p.ctx.beginPath();
  p.ctx.moveTo(X - size, Y - size); p.ctx.lineTo(X + size, Y + size);
  p.ctx.moveTo(X + size, Y - size); p.ctx.lineTo(X - size, Y + size);
  p.ctx.stroke();
  p.ctx.restore();
}

/** An ○ marker for a zero. */
export function zeroMark(p, x, y, color, size = 7) {
  p.ctx.save();
  p.ctx.strokeStyle = color; p.ctx.lineWidth = 2.5;
  p.ctx.beginPath(); p.ctx.arc(p.X(x), p.Y(y), size, 0, 2 * Math.PI); p.ctx.stroke();
  p.ctx.restore();
}
