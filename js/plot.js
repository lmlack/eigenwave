// Canvas figures for lessons. A Plot maps a world box (x and y ranges) onto a
// canvas, keeps it sharp on any screen, redraws on resize and theme change,
// and offers draggable handles that work with a mouse or a finger.
//
//   const fig = figure({ x: [-3, 3], y: [-3, 3], equal: true, aspect: 1 });
//   fig.plot.draw((p) => { p.arrow(0, 0, 1, 2, { color: p.c.blue }); });
//   fig.plot.handle({ get: () => [x, y], set: (nx, ny) => { ... } });
//
// Colors come from the CSS tokens, read fresh on every theme change, so a
// figure never has a color of its own that dark mode forgets.

import { cssVar, el } from "./ui.js";

const COLOR_VARS = ["fg", "fg-muted", "fg-subtle", "line", "line-strong", "grid", "panel", "raised",
  "accent", "blue", "green", "purple", "gold"];

export function colors() {
  const c = {};
  for (const k of COLOR_VARS) c[k.replace(/-(\w)/g, (_, l) => l.toUpperCase())] = cssVar(`--${k}`);
  return c;
}

/** A tidy tick step for a span: 1, 2 or 5 times a power of ten. */
export function niceStep(span, target = 6) {
  const raw = span / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export class Plot {
  /**
   * opts: x, y (ranges), equal (same scale both ways), grid, axes (draw the
   * x and y axes), ticks (numbers on the axes), xTicks/yTicks (step or array
   * of [value, label]), xLabel, yLabel, pad, vAxis (false leaves out the
   * vertical axis line, for signals plotted against an index).
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.o = { grid: true, axes: true, ticks: true, equal: false, ...opts };
    this.x0 = opts.x?.[0] ?? -1; this.x1 = opts.x?.[1] ?? 1;
    this.y0 = opts.y?.[0] ?? -1; this.y1 = opts.y?.[1] ?? 1;
    this.c = colors();
    this.drawFn = null;
    this.handles = [];
    this._onDrag = null;
    this.pending = false;
    this.w = 0; this.h = 0;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.onTheme = () => { this.c = colors(); this.request(); };
    window.addEventListener("sb:theme", this.onTheme);
    this.bindPointer();
  }

  setRange(x, y) {
    if (x) [this.x0, this.x1] = x;
    if (y) [this.y0, this.y1] = y;
    this.fit();
    this.request();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.fit();
    this.render();
  }

  /** Work out the pixel box. With equal on, the shorter range grows to keep circles round. */
  fit() {
    const ticks = this.o.ticks && this.o.axes;
    const pad = { l: ticks ? 34 : 8, r: 10, t: 10, b: ticks ? 24 : 8, ...this.o.pad };
    this.pad = pad;
    let [x0, x1, y0, y1] = [this.x0, this.x1, this.y0, this.y1];
    const pw = this.w - pad.l - pad.r, ph = this.h - pad.t - pad.b;
    if (this.o.equal && pw > 0 && ph > 0) {
      const sx = pw / (x1 - x0), sy = ph / (y1 - y0);
      if (sx > sy) { const c = (x0 + x1) / 2, half = pw / sy / 2; x0 = c - half; x1 = c + half; }
      else { const c = (y0 + y1) / 2, half = ph / sx / 2; y0 = c - half; y1 = c + half; }
    }
    this.vx0 = x0; this.vx1 = x1; this.vy0 = y0; this.vy1 = y1;
    this.sx = pw / (x1 - x0);
    this.sy = ph / (y1 - y0);
  }

  X(x) { return this.pad.l + (x - this.vx0) * this.sx; }
  Y(y) { return this.pad.t + (this.vy1 - y) * this.sy; }
  toWorld(px, py) { return [this.vx0 + (px - this.pad.l) / this.sx, this.vy1 - (py - this.pad.t) / this.sy]; }

  draw(fn) {
    this.drawFn = fn;
    this.request();
    return this;
  }

  request() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.render();
    });
  }

  render() {
    if (!this.w) return;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = this.c.panel;
    ctx.fillRect(0, 0, this.w, this.h);
    if (this.o.grid || this.o.axes) this.drawFrame();
    // Keep drawing inside the plot box, so long lines don't run over the tick labels.
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.pad.l, this.pad.t, this.w - this.pad.l - this.pad.r, this.h - this.pad.t - this.pad.b);
    ctx.clip();
    this.drawFn?.(this);
    ctx.restore();
    for (const h of this.handles) if (h.visible?.() !== false) this.drawHandle(h);
  }

  drawFrame() {
    const { ctx, c } = this;
    const xs = Array.isArray(this.o.xTicks) ? this.o.xTicks : null;
    const ys = Array.isArray(this.o.yTicks) ? this.o.yTicks : null;
    const xStep = typeof this.o.xTicks === "number" ? this.o.xTicks : niceStep(this.vx1 - this.vx0, Math.max(3, this.w / 80));
    const yStep = typeof this.o.yTicks === "number" ? this.o.yTicks : niceStep(this.vy1 - this.vy0, Math.max(3, this.h / 60));
    const xVals = xs ? xs.map((t) => t[0]) : range(this.vx0, this.vx1, xStep);
    const yVals = ys ? ys.map((t) => t[0]) : range(this.vy0, this.vy1, yStep);
    ctx.lineWidth = 1;
    if (this.o.grid) {
      ctx.strokeStyle = c.grid;
      ctx.beginPath();
      for (const x of xVals) { const px = Math.round(this.X(x)) + 0.5; ctx.moveTo(px, this.pad.t); ctx.lineTo(px, this.h - this.pad.b); }
      for (const y of yVals) { const py = Math.round(this.Y(y)) + 0.5; ctx.moveTo(this.pad.l, py); ctx.lineTo(this.w - this.pad.r, py); }
      ctx.stroke();
    }
    if (!this.o.axes) return;
    // Axes sit at zero when zero is in view, otherwise along the edge.
    const ax = clamp(this.Y(0), this.pad.t, this.h - this.pad.b);
    const ay = clamp(this.X(0), this.pad.l, this.w - this.pad.r);
    ctx.strokeStyle = c.lineStrong;
    ctx.beginPath();
    ctx.moveTo(this.pad.l, Math.round(ax) + 0.5); ctx.lineTo(this.w - this.pad.r, Math.round(ax) + 0.5);
    // Signal plots (index across) leave out the vertical axis: it would sit on the first stem.
    if (this.o.vAxis !== false) { ctx.moveTo(Math.round(ay) + 0.5, this.pad.t); ctx.lineTo(Math.round(ay) + 0.5, this.h - this.pad.b); }
    ctx.stroke();
    if (!this.o.ticks) return;
    ctx.fillStyle = c.fgSubtle;
    ctx.font = "11px \"Hyper Mono\", ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const lx = (v) => (xs ? xs.find((t) => t[0] === v)[1] : tickLabel(v, xStep));
    const ly = (v) => (ys ? ys.find((t) => t[0] === v)[1] : tickLabel(v, yStep));
    for (const x of xVals) if (Math.abs(x) > 1e-9 || xs || this.o.vAxis === false) ctx.fillText(lx(x), this.X(x), this.h - this.pad.b + 6);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const y of yVals) if (Math.abs(y) > 1e-9 || ys) ctx.fillText(ly(y), this.pad.l - 6, this.Y(y));
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    if (this.o.xLabel) { ctx.textAlign = "right"; ctx.fillText(this.o.xLabel, this.w - this.pad.r - 2, ax - 6); }
    if (this.o.yLabel) { ctx.textAlign = "left"; ctx.fillText(this.o.yLabel, ay + 6, this.pad.t + 10); }
  }

  /* ---------- Drawing, in world coordinates ---------- */

  /** A polyline through points [[x, y], ...]. */
  path(pts, { color = this.c.blue, width = 2, dash = null, close = false, fill = null, alpha = 1 } = {}) {
    const { ctx } = this;
    if (!pts.length) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(this.X(x), this.Y(y)) : ctx.moveTo(this.X(x), this.Y(y))));
    if (close) ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (width > 0) {
      ctx.setLineDash(dash ?? []);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  line(x0, y0, x1, y1, o = {}) { this.path([[x0, y0], [x1, y1]], o); }

  /** y = f(x) across the view, sampled every couple of pixels. */
  fn(f, o = {}) {
    const n = Math.max(2, Math.ceil(this.w / 2));
    const a = o.from ?? this.vx0, b = o.to ?? this.vx1;
    const pts = [];
    for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; pts.push([x, f(x)]); }
    this.path(pts, o);
  }

  /** A stem plot: a line from zero to each value, with a dot on top. */
  stems(xs, ys, { color = this.c.blue, r = 3.5, width = 1.6, alpha = 1 } = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) { ctx.moveTo(this.X(xs[i]), this.Y(0)); ctx.lineTo(this.X(xs[i]), this.Y(ys[i])); }
    ctx.stroke();
    for (let i = 0; i < xs.length; i++) { ctx.beginPath(); ctx.arc(this.X(xs[i]), this.Y(ys[i]), r, 0, 2 * Math.PI); ctx.fill(); }
    ctx.restore();
  }

  /** An arrow from (x0, y0) to (x1, y1). */
  arrow(x0, y0, x1, y1, { color = this.c.blue, width = 2.5, head = 10, dash = null, alpha = 1 } = {}) {
    const { ctx } = this;
    const [a, b, c, d] = [this.X(x0), this.Y(y0), this.X(x1), this.Y(y1)];
    const len = Math.hypot(c - a, d - b);
    if (len < 1) return;
    const ux = (c - a) / len, uy = (d - b) / len;
    const h = Math.min(head, len * 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
    ctx.setLineDash(dash ?? []);
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c - ux * h * 0.8, d - uy * h * 0.8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(c, d);
    ctx.lineTo(c - ux * h - uy * h * 0.45, d - uy * h + ux * h * 0.45);
    ctx.lineTo(c - ux * h + uy * h * 0.45, d - uy * h - ux * h * 0.45);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /** A dot, radius in pixels. */
  dot(x, y, { r = 4, color = this.c.fg, stroke = null } = {}) {
    const { ctx } = this;
    ctx.beginPath(); ctx.arc(this.X(x), this.Y(y), r, 0, 2 * Math.PI);
    ctx.fillStyle = color; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  /** A circle in world units (needs equal: true to look round). */
  circle(cx, cy, r, { color = this.c.lineStrong, width = 1.5, dash = null, fill = null } = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(this.X(cx), this.Y(cy), r * this.sx, r * this.sy, 0, 0, 2 * Math.PI);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (width) { ctx.setLineDash(dash ?? []); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
    ctx.restore();
  }

  /** Text at a world point, nudged by dx, dy pixels. */
  text(s, x, y, { color = this.c.fg, align = "left", base = "middle", dx = 0, dy = 0, size = 13, weight = 600, mono = false } = {}) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${mono ? "Hyper Mono, ui-monospace, monospace" : "Hyper, system-ui, sans-serif"}`;
    ctx.textAlign = align; ctx.textBaseline = base;
    ctx.fillText(s, this.X(x) + dx, this.Y(y) + dy);
  }

  /** A filled rectangle in world units. */
  rect(x0, y0, x1, y1, { fill = this.c.raised, alpha = 1 } = {}) {
    const { ctx } = this;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = fill;
    ctx.fillRect(this.X(Math.min(x0, x1)), this.Y(Math.max(y0, y1)), Math.abs(x1 - x0) * this.sx, Math.abs(y1 - y0) * this.sy);
    ctx.restore();
  }

  /* ---------- Handles and pointer input ---------- */

  /**
   * A draggable point. get() returns [x, y] in world units; set(x, y) is
   * called while dragging. Optional: color (a CSS color, or (c) => one of the
   * theme colors c), r (px), visible(), label, draw(plot, x, y) to draw it
   * yourself.
   */
  handle(h) {
    this.handles.push({ r: 8, ...h });
    this.canvas.classList.add("draggable");
    this.request();
    return this;
  }

  drawHandle(h) {
    const [x, y] = h.get();
    // A handle can draw itself (say, as a pole's ×); it still drags the same way.
    if (h.draw) { h.draw(this, x, y); return; }
    const { ctx } = this;
    const px = this.X(x), py = this.Y(y);
    ctx.beginPath(); ctx.arc(px, py, h.r, 0, 2 * Math.PI);
    // color may be a function of the theme colors, so it follows dark mode.
    const col = typeof h.color === "function" ? h.color(this.c) : h.color ?? this.c.accent;
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = this.c.panel; ctx.stroke();
    if (h.label) this.text(h.label, x, y, { dx: 12, dy: -12, color: col });
  }

  /**
   * Pointer handling: a press near a handle drags it; otherwise onDrag (if
   * set) gets world coordinates for drawing-style input. A finger gets a
   * bigger target than a mouse.
   */
  // Setting onDrag marks the canvas draggable, so a finger on it drags
  // instead of scrolling the page. Figures with nothing to drag still scroll.
  get onDrag() { return this._onDrag; }
  set onDrag(fn) {
    this._onDrag = fn;
    this.canvas.classList.toggle("draggable", !!fn || this.handles.length > 0);
  }

  bindPointer() {
    const cv = this.canvas;
    let active = null;
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    cv.addEventListener("pointerdown", (e) => {
      const [px, py] = pos(e);
      const reach = e.pointerType === "touch" ? 26 : 14;
      let best = null, bestD = reach;
      for (const h of this.handles) {
        if (h.visible?.() === false) continue;
        const [x, y] = h.get();
        const d = Math.hypot(this.X(x) - px, this.Y(y) - py);
        if (d < bestD) { best = h; bestD = d; }
      }
      if (best) active = { kind: "handle", h: best };
      else if (this.onDrag) active = { kind: "free" };
      else return;
      cv.setPointerCapture(e.pointerId);
      e.preventDefault();
      move(e, true);
    });
    const move = (e, first = false) => {
      if (!active) {
        if (e.pointerType === "mouse") {
          const [px, py] = pos(e);
          const near = this.handles.some((h) => {
            if (h.visible?.() === false) return false;
            const [x, y] = h.get();
            return Math.hypot(this.X(x) - px, this.Y(y) - py) < 14;
          });
          cv.style.cursor = near ? "grab" : this.onDrag ? "crosshair" : "";
        }
        return;
      }
      const [wx, wy] = this.toWorld(...pos(e));
      if (active.kind === "handle") active.h.set(wx, wy);
      else this.onDrag(wx, wy, first);
      this.request();
    };
    cv.addEventListener("pointermove", (e) => move(e));
    const end = () => { if (active) { active = null; this.onDragEnd?.(); } };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
  }

  destroy() {
    this.ro.disconnect();
    window.removeEventListener("sb:theme", this.onTheme);
  }
}

/**
 * A figure: a canvas in a wrapper with an optional caption and readout,
 * sized by aspect ratio (width / height); phoneAspect (default: no wider than
 * 1.15) applies at 640 px and below. Returns { el, plot, readout(text) }.
 */
export function figure({ aspect = 1.6, phoneAspect = Math.min(aspect, 1.15), cap = "", label = "", ...opts } = {}) {
  const canvas = el("canvas", { "aria-label": label || cap || "figure", role: "img" });
  // On a phone a wide figure would be a thin strip, so it gets taller there.
  const narrow = window.matchMedia("(max-width: 640px)");
  const setAspect = () => (canvas.style.aspectRatio = String(narrow.matches ? phoneAspect : aspect));
  setAspect();
  narrow.addEventListener("change", setAspect);
  const ro = el("div", { class: "readout", hidden: true });
  const wrap = el("figure", { class: "fig", style: "margin:0" }, canvas, ro, cap ? el("figcaption", { class: "cap", html: cap }) : null);
  const plot = new Plot(canvas, opts);
  return {
    el: wrap,
    plot,
    readout(text) {
      ro.hidden = !text;
      ro.textContent = text ?? "";
    },
  };
}

/**
 * Runs step(dt) every frame while `isOn()` is true and the element is on
 * screen. Returns stop(). dt is in seconds, capped so a background tab
 * doesn't jump.
 */
export function animate(elm, step, isOn = () => true) {
  let visible = true, raf = 0, last = 0, stopped = false;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
  io.observe(elm);
  function frame(t) {
    raf = 0;
    if (stopped || !visible || !isOn()) { last = 0; return; }
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    step(dt);
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !stopped) raf = requestAnimationFrame(frame); }
  kick();
  return {
    kick,
    stop() { stopped = true; io.disconnect(); if (raf) cancelAnimationFrame(raf); },
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function range(a, b, step) {
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
  return out;
}
function tickLabel(v, step) {
  // As many decimals as the step needs: 0.25 shows two, 0.5 one, 2 none.
  let d = 0;
  while (d < 4 && Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) > 1e-6) d++;
  return v.toFixed(d).replace(/^-0(\.0+)?$/, "0").replace("-", "−");
}
