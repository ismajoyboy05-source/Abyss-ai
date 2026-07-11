/* journal.js — Journal intime guidé (privé, local). */
import { store } from "../store.js";
import { el, toast, relDate, modal } from "../ui.js";

const PROMPTS = [
  "Qu'est-ce qui t'a fait du bien aujourd'hui, même une petite chose ?",
  "Qu'est-ce que tu aurais aimé dire à quelqu'un aujourd'hui ?",
  "Si ton émotion du moment pouvait parler, qu'est-ce qu'elle dirait ?",
  "De quoi es-tu un peu fier·e récemment ?",
  "Qu'est-ce qui te pèse en ce moment, et depuis quand ?",
  "Nomme trois choses pour lesquelles tu ressens de la gratitude.",
  "Comment te sens-tu, vraiment, si personne ne te jugeait ?",
  "Qu'est-ce que tu dirais à un·e ami·e qui vit ce que tu vis ?",
];
const MOOD_TAGS = ["🙂", "😔", "😰", "😌", "😤", "🥲", "✨"];

export function renderJournal(root) {
  let prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  let moodTag = "";

  const promptPill = el("div", { class: "prompt-pill" }, "✍️ ", el("span", {}, prompt));
  const shuffle = el("button", { class: "link-btn", style: "margin:0 0 12px" }, "Une autre inspiration ↻");
  shuffle.addEventListener("click", () => {
    prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    promptPill.querySelector("span").textContent = prompt;
  });

  const area = el("textarea", { class: "textarea", style: "min-height:150px", placeholder: "Écris librement… personne ne lira ça à part toi.", "aria-label": "Entrée de journal" });

  const tagRow = el("div", { class: "chips", style: "margin-top:12px" });
  MOOD_TAGS.forEach((t) => {
    const c = el("button", { class: "chip" }, t);
    c.addEventListener("click", () => {
      moodTag = moodTag === t ? "" : t;
      tagRow.querySelectorAll(".chip").forEach((x) => x.classList.remove("is-active"));
      if (moodTag) c.classList.add("is-active");
    });
    tagRow.append(c);
  });

  const save = el("button", { class: "btn btn--primary btn--block", style: "margin-top:16px" }, "Sauvegarder");
  save.addEventListener("click", () => {
    const text = area.value.trim();
    if (!text) { toast("Écris quelques mots d'abord 🙂"); return; }
    store.addJournal({ text, moodEmoji: moodTag });
    toast("C'est posé. Bravo pour ce moment 💜");
    area.value = ""; moodTag = "";
    refreshList();
  });

  const list = el("div", { class: "entry-list" });
  function refreshList() {
    list.innerHTML = "";
    const entries = store.journal();
    if (!entries.length) {
      list.append(el("p", { class: "empty" }, "Ton jardin secret est encore vide 🌱\nTa première pensée l'attend."));
      return;
    }
    entries.forEach((e) => list.append(entryCard(e, refreshList)));
  }
  refreshList();

  root.append(
    el("p", { class: "eyebrow" }, "Journal"),
    el("h1", { class: "h1" }, "Pose tes pensées, ", el("span", { class: "gradient-text" }, "au calme")),
    el("p", { class: "muted", style: "margin:0 0 16px" }, "Un espace 100 % privé qui ne quitte jamais ton appareil."),
    el("div", { class: "card" }, promptPill, shuffle, area, tagRow, save),
    el("h2", { class: "h2" }, "Tes pensées"),
    list,
  );
}

function entryCard(e, onChange) {
  const del = el("button", { class: "link-btn" }, "Supprimer");
  del.addEventListener("click", () => {
    modal((close) => el("div", {},
      el("h2", {}, "Supprimer cette pensée ?"),
      el("p", { class: "muted" }, "Cette action est définitive."),
      el("div", { style: "display:flex;gap:10px;margin-top:18px" },
        el("button", { class: "btn btn--ghost btn--block", onclick: close }, "Annuler"),
        el("button", { class: "btn btn--primary btn--block", onclick: () => { store.removeJournal(e.id); close(); onChange(); toast("Supprimé."); } }, "Supprimer"),
      ),
    ));
  });
  return el("div", { class: "entry" },
    el("div", { class: "entry__meta" },
      el("span", { class: "entry__date" }, relDate(e.ts)),
      el("span", { class: "entry__mood" }, e.moodEmoji || ""),
    ),
    el("div", { class: "entry__text" }, e.text),
    el("div", { style: "text-align:right;margin-top:6px" }, del),
  );
}
