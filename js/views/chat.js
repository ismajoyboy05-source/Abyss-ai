/* chat.js — Interface du compagnon conversationnel. */
import { store } from "../store.js";
import { el, wait } from "../ui.js";
import { reply, welcome, QUICK_REPLIES } from "../companion.js";

const ROUTE_LABEL = { breathe: "🫧 Faire une respiration", journal: "📓 Écrire dans mon journal", mood: "🎨 Noter mon humeur" };

export function renderChat(root, navigate) {
  const log = el("div", { class: "chat__log", role: "log", "aria-live": "polite" });
  const input = el("input", { class: "input", type: "text", placeholder: "Écris ce que tu ressens…", "aria-label": "Message", autocomplete: "off" });
  const sendBtn = el("button", { class: "send-btn", "aria-label": "Envoyer" },
    el("span", { html: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"/></svg>' }));

  const quick = el("div", { class: "quick-replies" });
  QUICK_REPLIES.forEach((q) => {
    const c = el("button", { class: "chip" }, q);
    c.addEventListener("click", () => send(q));
    quick.append(c);
  });

  root.append(
    el("div", { class: "chat" },
      log,
      quick,
      el("form", { class: "composer", onsubmit: (e) => { e.preventDefault(); send(input.value); } }, input, sendBtn),
      el("p", { class: "disclaimer" },
        "Compagnon local, sans jugement — il ne remplace pas un·e professionnel·le. Détresse ? ",
        el("a", { href: "tel:3114", style: "color:var(--pink);font-weight:800" }, "3114"), "."),
    ),
  );

  const ctx = () => ({ name: store.profile.name, lastMood: store.lastMood() });

  // Restaure l'historique, ou message d'accueil.
  const history = store.chat();
  if (history.length) {
    history.forEach((m) => addBubble(m.role, m.text, false));
  } else {
    const w = welcome(ctx());
    store.addChat("bot", w);
    addBubble("bot", w, false);
  }
  scrollDown();

  function addBubble(role, html, animate = true) {
    const b = el("div", { class: "msg " + (role === "me" ? "msg--me" : "msg--bot"), html });
    if (!animate) b.style.animation = "none";
    log.append(b);
    return b;
  }

  function addResources(res, close) {
    const box = el("div", { class: "msg msg--bot msg--alert" },
      el("div", { class: "msg__res" }, ...res.map((r) =>
        el("a", { href: r.href }, "📞 ", r.label))),
    );
    log.append(box);
    if (close) log.append(el("div", { class: "msg msg--bot" }, close));
  }

  function addSuggestion(route) {
    if (!ROUTE_LABEL[route]) return;
    const s = el("button", { class: "chip", style: "align-self:flex-start;margin-top:2px" }, ROUTE_LABEL[route]);
    s.addEventListener("click", () => navigate(route));
    log.append(s);
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text) return;
    input.value = "";
    store.addChat("me", text);
    addBubble("me", escapeUser(text));
    scrollDown();

    // Indicateur de saisie, avec un délai « humain » proportionnel.
    const typing = el("div", { class: "typing" }, el("span"), el("span"), el("span"));
    log.append(typing); scrollDown();

    const r = reply(text, ctx());
    await wait(650 + Math.min(1400, text.length * 22));
    typing.remove();

    const bubble = addBubble("bot", r.html);
    if (r.kind === "crisis") bubble.classList.add("msg--alert");
    store.addChat("bot", r.html);

    if (r.resources) addResources(r.resources, r.close);
    if (r.suggest) addSuggestion(r.suggest);
    scrollDown();
  }

  function scrollDown() { requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); }
  setTimeout(() => input.focus(), 80);
}

// Le texte utilisateur est échappé avant affichage (les réponses du bot
// sont, elles, construites en interne à partir de gabarits sûrs).
function escapeUser(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
