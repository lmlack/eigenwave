// Building blocks for lessons: elements, controls, and the standard lesson
// sections (prose, panels, "Try it", the math, what the symbols mean).
// Every lesson is made of these so they all look and behave alike.

import { inl, row } from "./tex.js";

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Fixed decimals without "-0.00". */
export function fmt(v, d = 2) {
  const s = v.toFixed(d);
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
}

/* ---------- Sections ---------- */

/** A block of text. `html` may hold inline math made with inl(). */
export const prose = (html) => el("div", { class: "prose", html });

/** A card. Pass a title for a heading. */
export function panel(title, ...children) {
  return el("section", { class: "panel" }, title ? el("h2", { text: title }) : null, ...children);
}

/** The "Try it" box: a short list of things to do with the figure. */
export function tryIt(items) {
  return el("div", { class: "try", html: `<b>Try it</b><ul>${items.map((t) => `<li>${t}</li>`).join("")}</ul>` });
}

/**
 * The math panel. rows: [{ tex, note?, id? }] or plain strings of LaTeX.
 * A row with an id is live: update it later with math.set(id, tex).
 * symbols: [[latex, meaning], ...], shown as "What the symbols mean".
 */
export function mathPanel(rows, symbols = null, title = "The math") {
  const root = el("section", { class: "panel math" }, el("h2", { text: title }));
  const live = {};
  for (const r of rows) {
    const spec = typeof r === "string" ? { tex: r } : r;
    if (spec.html) {
      root.append(el("p", { class: "eq-note", html: spec.html }));
      continue;
    }
    const eq = el("div", { class: `eq${spec.id ? " live" : ""}`, html: spec.tex ? row(spec.tex) : "" });
    root.append(eq);
    if (spec.id) live[spec.id] = { el: eq, src: spec.tex };
    if (spec.note) root.append(el("p", { class: "eq-note", html: spec.note }));
  }
  if (symbols) {
    root.append(el("div", { class: "symbols", html:
      `<p>What the symbols mean</p><dl>${symbols.map(([s, m]) => `<dt>${inl(s)}</dt><dd>${m}</dd>`).join("")}</dl>` }));
  }
  return {
    el: root,
    set(id, tex) {
      const r = live[id];
      if (!r || r.src === tex) return;
      r.src = tex;
      r.el.innerHTML = row(tex);
    },
  };
}

/** "Up next" line at the end of a lesson. */
export const upNext = (html) => el("p", { class: "upnext", html: `<b>Up next:</b> ${html}` });

/* ---------- Controls ---------- */

/**
 * A labeled range slider. format(v) gives the shown value.
 * Returns { el, get, set }. onInput fires while dragging.
 */
export function slider({ label, min, max, step = 0.01, value, format = (v) => fmt(v, 2), onInput }) {
  const input = el("input", { type: "range", min, max, step, value });
  const val = el("span", { class: "val", text: format(value) });
  const id = `s${Math.random().toString(36).slice(2, 8)}`;
  input.id = id;
  input.addEventListener("input", () => {
    val.textContent = format(+input.value);
    onInput?.(+input.value);
  });
  return {
    el: el("div", { class: "ctl" }, el("label", { for: id, html: `<span>${label}</span>` }, val), input),
    get: () => +input.value,
    set(v) {
      input.value = v;
      val.textContent = format(+input.value);
    },
  };
}

/** A checkbox with a label. Returns { el, get, set }. */
export function check({ label, checked = false, onChange }) {
  const input = el("input", { type: "checkbox" });
  input.checked = checked;
  input.addEventListener("change", () => onChange?.(input.checked));
  return {
    el: el("label", { class: "check" }, input, el("span", { html: label })),
    get: () => input.checked,
    set: (v) => (input.checked = v),
  };
}

/** A segmented switch. options: [[value, label], ...]. Returns { el, get, set }. */
export function segmented({ options, value, onChange, label = "" }) {
  let cur = value;
  const root = el("div", { class: "segmented", role: "group", "aria-label": label });
  const buttons = options.map(([v, text]) => el("button", {
    type: "button", "aria-pressed": String(v === value), text,
    onclick: () => {
      set(v);
      onChange?.(v);
    },
  }));
  root.append(...buttons);
  function set(v) {
    cur = v;
    buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i][0] === v)));
  }
  return { el: root, get: () => cur, set };
}

/** A button. kind: "" or "solid". */
export const button = (text, onclick, kind = "") => el("button", { type: "button", class: `btn ${kind}`, text, onclick });

/** A row of controls laid out in a responsive grid. */
export const controls = (...children) => el("div", { class: "controls" }, ...children);

/** A legend: [[color css var or value, label], ...]. */
export function legend(items) {
  return el("div", { class: "legend", html: items.map(([c, t]) =>
    `<span><i style="background:${c.startsWith("--") ? `var(${c})` : c}"></i>${t}</span>`).join("") });
}

/** Loads a lesson's own stylesheet once (css/lessons/<id>.css), so lessons don't share one file. */
const loadedCss = new Set();
export function lessonCss(id) {
  if (loadedCss.has(id)) return;
  loadedCss.add(id);
  document.head.append(el("link", { rel: "stylesheet", href: `css/lessons/${id}.css` }));
}
