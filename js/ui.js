/* ui.js — Petites aides d'interface partagées. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Crée un élément avec attributs + enfants. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

/** Échappe le HTML pour éviter toute injection dans les messages. */
export function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/** Notification éphémère. */
export function toast(message, ms = 2600) {
  const root = $("#toast-root");
  const t = el("div", { class: "toast", role: "status" }, message);
  root.append(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s, transform .3s";
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
    setTimeout(() => t.remove(), 320);
  }, ms);
}

/** Modale simple. `render(close)` renvoie le contenu. */
export function modal(render) {
  const root = $("#modal-root");
  const close = () => { back.remove(); };
  const back = el("div", { class: "backdrop", onclick: (e) => { if (e.target === back) close(); } });
  const box = el("div", { class: "modal", role: "dialog", "aria-modal": "true" });
  box.append(render(close));
  back.append(box);
  root.append(back);
  const focusable = box.querySelector("input, button, textarea");
  if (focusable) setTimeout(() => focusable.focus(), 60);
  return close;
}

/** Formate une date relative en français. */
export function relDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const days = Math.floor((now.setHours(0,0,0,0) - new Date(ts).setHours(0,0,0,0)) / 864e5);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (days === 0) return `Aujourd'hui · ${time}`;
  if (days === 1) return `Hier · ${time}`;
  if (days < 7) return `Il y a ${days} jours · ${time}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + ` · ${time}`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
