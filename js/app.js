/* app.js — Point d'entrée : routeur, thème, onboarding, PWA. */
import { store } from "./store.js";
import { $, $$, el, modal, toast } from "./ui.js";
import { renderToday } from "./views/today.js";
import { renderMood } from "./views/mood.js";
import { renderBreathe } from "./views/breathe.js";
import { renderJournal } from "./views/journal.js";
import { renderChat } from "./views/chat.js";

const ROUTES = {
  today: renderToday,
  mood: renderMood,
  breathe: renderBreathe,
  journal: renderJournal,
  chat: renderChat,
};

const viewEl = $("#view");
let currentRoute = null;

function navigate(route) {
  if (!ROUTES[route]) route = "today";
  if (location.hash !== `#/${route}`) { location.hash = `#/${route}`; return; }
  render(route);
}

function render(route) {
  // Prévenir la vue sortante (nettoyage des timers, etc.).
  viewEl.dispatchEvent(new CustomEvent("view:leave"));
  viewEl.innerHTML = "";
  currentRoute = route;

  ROUTES[route](viewEl, navigate);

  // Onglet actif.
  $$(".nav__item").forEach((a) => a.classList.toggle("is-active", a.dataset.route === route));
  viewEl.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  viewEl.focus({ preventScroll: true });
}

function routeFromHash() {
  const m = location.hash.match(/^#\/(\w+)/);
  return m && ROUTES[m[1]] ? m[1] : "today";
}

window.addEventListener("hashchange", () => render(routeFromHash()));

/* ---------- Thème ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#F5F3FC" : "#100f1a");
  store.setProfile({ theme });
}
function initTheme() {
  const saved = store.profile.theme;
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(saved || (prefersLight ? "light" : "dark"));
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

/* ---------- Onboarding ---------- */
function onboarding() {
  return new Promise((resolve) => {
    modal((close) => {
      const input = el("input", { class: "input", type: "text", placeholder: "Ton prénom (ou un surnom)", maxlength: "24", "aria-label": "Prénom" });
      const finish = () => {
        store.setProfile({ name: input.value.trim().slice(0, 24), onboarded: true });
        close(); resolve();
      };
      return el("div", {},
        el("div", { style: "font-size:2.4rem;text-align:center;margin-bottom:6px" }, "🌿"),
        el("h2", { style: "text-align:center" }, "Bienvenue dans ", el("span", { class: "gradient-text" }, "Havre")),
        el("p", { class: "muted", style: "text-align:center;margin-top:4px" },
          "Ton espace pour souffler, comprendre tes émotions et avancer. Tout reste sur ton appareil — rien n'est partagé, jamais."),
        el("div", { class: "field" },
          el("label", {}, "Comment aimerais-tu que je t'appelle ?"),
          input,
        ),
        el("button", { class: "btn btn--primary btn--block", style: "margin-top:18px", onclick: finish }, "Entrer dans mon Havre"),
        el("button", { class: "link-btn", style: "display:block;margin:10px auto 0", onclick: finish }, "Passer pour l'instant"),
        el("p", { class: "disclaimer", style: "margin-top:14px" },
          "Havre est un soutien, pas un service médical. En cas de détresse : 3114 (24h/24, gratuit)."),
      );
    });
  });
}

/* ---------- PWA ---------- */
function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* hors-ligne indisponible, l'app marche quand même */ });
  });
}
function installPrompt() {
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); deferred = e;
    if (sessionStorage.getItem("havre.install.dismissed")) return;
    setTimeout(() => {
      const t = el("div", { class: "toast", style: "pointer-events:auto;cursor:pointer" },
        "📲 Installer Havre sur ton écran d'accueil");
      t.addEventListener("click", async () => { t.remove(); deferred?.prompt(); deferred = null; });
      $("#toast-root").append(t);
      setTimeout(() => t.remove(), 8000);
    }, 4000);
  });
}

/* ---------- Démarrage ---------- */
async function main() {
  initTheme();
  registerSW();
  installPrompt();
  if (!store.profile.onboarded) await onboarding();
  render(routeFromHash());
}
main();
