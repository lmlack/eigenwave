// Routing, theme, the course map and the lesson view. A lesson's module loads
// the first time it opens; leaving a lesson calls its destroy() so animations
// stop and listeners go away.

import { LESSONS, PARTS, byId } from "./lessons.js";
import { el } from "./ui.js";
import { LESSON_SOURCES, SOURCES } from "./refs.js";
import { stopAll } from "./audio.js";

const $ = (s) => document.querySelector(s);
let current = null; // { id, handle }

/* ---------- Course map and lesson list ---------- */

function buildMap() {
  const map = $("#course-map");
  PARTS.forEach((p, i) => {
    const list = el("ol");
    for (const l of LESSONS.filter((x) => x.part === i)) {
      list.append(el("li", {}, el("a", { href: `#${l.id}`, class: l.load ? "" : "soon" },
        el("span", { class: "n", text: String(l.n) }), el("span", { class: "t", text: l.title }))));
    }
    map.append(el("div", { class: "part-card" },
      el("p", { class: "eyebrow", text: `Part ${i + 1} · ${p.from}` }),
      el("h2", { text: p.title }), list));
  });
}

function buildNav() {
  const inner = el("div");
  PARTS.forEach((p, i) => {
    inner.append(el("p", { class: "part", text: `Part ${i + 1} · ${p.title}` }));
    for (const l of LESSONS.filter((x) => x.part === i)) {
      inner.append(el("a", { href: `#${l.id}`, "data-id": l.id, class: l.load ? "" : "soon" },
        el("span", { class: "n", text: String(l.n) }), el("span", { text: l.title })));
    }
  });
  // On a phone the list folds into one "All lessons" row above the lesson.
  $("#lesson-nav").append(el("details", { open: window.matchMedia("(min-width: 901px)").matches },
    el("summary", { text: "All lessons" }), inner));
}

/* ---------- Views ---------- */

async function route() {
  const id = location.hash.slice(1);
  const lesson = byId[id];
  if (current) {
    current.handle?.destroy?.();
    current = null;
  }
  stopAll(); // no sound carries over from one page to the next
  const refs = id === "references";
  $("#home").hidden = !!lesson || refs;
  $("#lesson").hidden = !lesson;
  $("#references").hidden = !refs;
  if (refs) {
    document.title = "References · eigenwave";
    window.scrollTo(0, 0);
    return;
  }
  if (!lesson) {
    document.title = "eigenwave";
    return;
  }
  document.title = `${lesson.title} · eigenwave`;
  $("#lesson-part").textContent = `Part ${lesson.part + 1} · ${PARTS[lesson.part].title} · Lesson ${lesson.n}`;
  $("#lesson-title").textContent = lesson.title;
  for (const a of document.querySelectorAll("#lesson-nav a")) {
    if (a.dataset.id === id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  const details = $("#lesson-nav details");
  if (window.matchMedia("(max-width: 900px)").matches) details.open = false;

  const prev = LESSONS[lesson.n - 2];
  const next = LESSONS[lesson.n];
  setFoot($("#lesson-prev"), prev ? `#${prev.id}` : "#home", prev ? `Previous: ${prev.title}` : "All lessons");
  setFoot($("#lesson-next"), next ? `#${next.id}` : "#home", next ? `Next: ${next.title}` : "Back to all lessons");

  showSources(id);
  const body = $("#lesson-body");
  body.replaceChildren();
  window.scrollTo(0, 0);
  if (!lesson.load) {
    body.append(el("p", { class: "note", text: "This lesson is still being written. The ones without “soon” next to them are ready." }));
    return;
  }
  try {
    const mod = await lesson.load();
    if (location.hash.slice(1) !== id) return; // moved on while loading
    current = { id, handle: mod.mount(body) ?? {} };
  } catch (err) {
    console.error(err);
    body.append(el("p", { class: "note", text: "This lesson failed to load. Try reloading the page." }));
  }
}

/* ---------- Sources ---------- */

function showSources(id) {
  const box = $("#lesson-sources");
  const list = LESSON_SOURCES[id] ?? [];
  box.hidden = !list.length;
  box.replaceChildren();
  if (!list.length) return;
  box.append(el("h2", { text: "Sources" }),
    el("ul", {}, ...list.map(([key, where]) => el("li", { html:
      `${SOURCES[key].short}, ${where}. <a href="#references" data-ref="${key}">Full reference</a>` }))));
}

function buildReferences() {
  const order = ["strang", "oppenheim", "dtsp", "brunton", "bruntonVideos", "cooley", "shannon", "gabor"];
  $("#ref-list").append(...order.map((key) => {
    const s = SOURCES[key];
    const used = Object.entries(LESSON_SOURCES).filter(([, l]) => l.some(([k]) => k === key)).map(([lid]) => lid);
    const links = used.map((lid) => { const l = byId[lid]; return `<a href="#${lid}">${l.n}</a>`; }).join(", ");
    const cite = s.cite.replace(/https:\/\/doi\.org\/\S+?(?=\s|$)/g, (u) => `<a href="${u}" rel="noopener">${u}</a>`);
    return el("li", { id: `ref-${key}`, html: `${cite}${s.url && !s.cite.includes(s.url) ? ` <a href="${s.url}" rel="noopener">${s.url.replace(/^https?:\/\//, "")}</a>` : ""}<br><span class="small subtle">Used in lessons ${links}.</span>` });
  }));
  // "Full reference" jumps to its entry once the page is showing.
  document.addEventListener("click", (e) => {
    const key = e.target.closest?.("[data-ref]")?.dataset.ref;
    if (key) setTimeout(() => document.getElementById(`ref-${key}`)?.scrollIntoView({ block: "center" }), 50);
  });
}

function setFoot(a, href, text) {
  a.href = href;
  a.replaceChildren(el("span", { text }));
}

/* ---------- Theme ---------- */

function applyTheme(dark) {
  if (dark) document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  try {
    if (dark) localStorage.setItem("sb-theme", "dark");
    else localStorage.removeItem("sb-theme");
  } catch {
    // Private browsing: it applies, it just isn't remembered.
  }
  syncThemeButtons();
  window.dispatchEvent(new Event("sb:theme"));
}
function syncThemeButtons() {
  const dark = document.documentElement.dataset.theme === "dark";
  for (const b of document.querySelectorAll("[data-theme-set]")) {
    b.setAttribute("aria-pressed", String((b.dataset.themeSet === "dark") === dark));
  }
}
for (const b of document.querySelectorAll("[data-theme-set]")) {
  b.addEventListener("click", () => applyTheme(b.dataset.themeSet === "dark"));
}

buildMap();
buildNav();
buildReferences();
syncThemeButtons();
window.addEventListener("hashchange", route);
route();
