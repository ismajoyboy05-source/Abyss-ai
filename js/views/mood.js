/* mood.js — Suivi d'humeur : sélection émotionnelle + historique visuel. */
import { store } from "../store.js";
import { el, toast } from "../ui.js";

const MOODS = [
  { key: "rayonnant", label: "Rayonnant·e", emoji: "😄", color: "#6FE7C7", score: 5 },
  { key: "bien", label: "Bien", emoji: "🙂", color: "#9BE77C", score: 4 },
  { key: "neutre", label: "Neutre", emoji: "😐", color: "#FFC98B", score: 3 },
  { key: "stresse", label: "Stressé·e", emoji: "😰", color: "#FF9EC4", score: 2 },
  { key: "triste", label: "Triste", emoji: "😔", color: "#8FA0FF", score: 2 },
  { key: "epuise", label: "Épuisé·e", emoji: "😴", color: "#B78CFF", score: 2 },
  { key: "enerve", label: "Énervé·e", emoji: "😤", color: "#FF8B8B", score: 2 },
  { key: "anxieux", label: "Anxieux·se", emoji: "😟", color: "#9B8CFF", score: 1 },
];

export function renderMood(root, navigate) {
  let selected = null;
  const noteEl = el("textarea", { class: "textarea", placeholder: "Un mot sur ce qui se passe ? (optionnel)", "aria-label": "Note d'humeur" });

  const grid = el("div", { class: "mood-grid" });
  MOODS.forEach((m) => {
    const btn = el("button", { class: "mood-btn", style: `--sel:${m.color}`, "aria-pressed": "false" },
      el("span", { class: "mood-btn__emoji" }, m.emoji),
      el("span", { class: "mood-btn__lbl" }, m.label),
    );
    btn.addEventListener("click", () => {
      selected = m;
      grid.querySelectorAll(".mood-btn").forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("is-active"); btn.setAttribute("aria-pressed", "true");
      saveBtn.disabled = false;
    });
    grid.append(btn);
  });

  const saveBtn = el("button", { class: "btn btn--primary btn--block", disabled: true, style: "margin-top:16px" }, "Enregistrer mon humeur");
  saveBtn.addEventListener("click", () => {
    if (!selected) return;
    store.addMood({ key: selected.key, label: selected.label, emoji: selected.emoji, color: selected.color, score: selected.score, note: noteEl.value.trim() });
    toast("Humeur enregistrée 💜");
    navigate("mood"); // recharge la vue avec le nouvel historique
  });

  root.append(
    el("p", { class: "eyebrow" }, "Mon humeur"),
    el("h1", { class: "h1" }, "Qu'est-ce que tu ressens, ", el("span", { class: "gradient-text" }, "là ?")),
    el("p", { class: "muted", style: "margin:0 0 16px" }, "Mettre un mot sur une émotion, c'est déjà commencer à l'apprivoiser."),
    el("div", { class: "card" }, grid, noteEl, saveBtn),
    renderHistory(),
  );
}

function renderHistory() {
  const moods = store.moods();
  const wrap = el("div", { class: "card", style: "margin-top:16px" },
    el("p", { class: "eyebrow", style: "margin-bottom:2px" }, "Tes 7 derniers relevés"));

  if (!moods.length) {
    wrap.append(el("p", { class: "empty" }, "Ton historique apparaîtra ici, comme une petite météo intérieure. ⛅"));
    return wrap;
  }

  const recent = moods.slice(-7);
  const maxScore = 5;
  const bars = el("div", { class: "bars", role: "img", "aria-label": "Graphique des humeurs récentes" });
  recent.forEach((m) => {
    const h = Math.max(8, (m.score / maxScore) * 100);
    const day = new Date(m.ts).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
    bars.append(
      el("div", { class: "bar-wrap" },
        el("span", { class: "bar-emoji" }, m.emoji),
        el("div", { class: "bar", style: `height:${h}%;background:${m.color}` }),
        el("span", { class: "bar-day" }, day),
      ),
    );
  });
  wrap.append(bars);

  // Petit bilan encourageant.
  const avg = recent.reduce((s, m) => s + m.score, 0) / recent.length;
  const insight = avg >= 4 ? "Ça brille plutôt bien ces temps-ci ✨ Continue à prendre soin de toi."
    : avg >= 2.7 ? "Des hauts et des bas, c'est profondément humain 🌗 Tu tiens le cap."
    : "Ces jours-ci semblent lourds 💙 Sois patient·e avec toi. Parler ou respirer peut aider.";
  wrap.append(el("p", { class: "muted", style: "margin:14px 0 0;font-size:.9rem" }, insight));
  return wrap;
}
