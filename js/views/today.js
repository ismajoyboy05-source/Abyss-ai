/* today.js — Écran « Aujourd'hui » : accueil, check-in, accès rapides. */
import { store } from "../store.js";
import { el, greeting } from "../ui.js";

const AFFIRMATIONS = [
  "Tu n'as pas à être productif·ve pour avoir de la valeur.",
  "Une émotion, ça passe. Tu es plus vaste que ce que tu ressens là.",
  "Respirer, c'est déjà prendre soin de toi.",
  "Tu fais de ton mieux avec ce que tu as aujourd'hui, et c'est suffisant.",
  "Demander de l'aide, c'est une force, jamais une faiblesse.",
  "Ce moment difficile n'est pas toute ta vie, juste un chapitre.",
  "Tu as le droit d'exister sans te justifier.",
  "Chaque petit pas compte, même invisible.",
];

export function renderToday(root, navigate) {
  const p = store.profile;
  const streak = store.touchVisit();
  const stats = store.stats();
  const last = store.lastMood();
  const name = p.name ? `, ${p.name}` : "";
  const affirmation = AFFIRMATIONS[Math.floor(Date.now() / 864e5) % AFFIRMATIONS.length];

  root.append(
    el("p", { class: "eyebrow" }, `${greeting()}${name}`),
    el("h1", { class: "h1" }, "Comment va ", el("span", { class: "gradient-text" }, "ton cœur"), " aujourd'hui ?"),

    el("div", { class: "card card--hero", style: "margin-top:14px" },
      el("div", { class: "hero-row" },
        el("div", { class: "hero-emoji" }, "🌿"),
        el("div", {},
          el("p", { style: "margin:0;font-weight:700" }, "Pensée du jour"),
          el("p", { class: "muted", style: "margin:4px 0 0" }, affirmation),
        ),
      ),
    ),

    el("div", { class: "quick-actions" },
      quickAction("💬", "Parler", "Vide ton sac, sans jugement", () => navigate("chat")),
      quickAction("🫧", "Respirer", "1 minute pour t'apaiser", () => navigate("breathe")),
      quickAction("🎨", "Mon humeur", "Nomme ce que tu ressens", () => navigate("mood")),
      quickAction("📓", "Journal", "Pose tes pensées au calme", () => navigate("journal")),
    ),

    el("div", { class: "stat-row" },
      stat(streak, streak > 1 ? "jours de suite 🔥" : "jour ici 🌱"),
      stat(stats.breaths, "respirations 🫁"),
      stat(store.moods().length, "humeurs notées 🎯"),
    ),

    last
      ? el("div", { class: "card", style: "margin-top:16px" },
          el("p", { class: "muted", style: "margin:0 0 6px;font-size:.85rem" }, "Ta dernière humeur"),
          el("div", { class: "hero-row" },
            el("div", { class: "hero-emoji" }, last.emoji),
            el("div", {},
              el("p", { style: "margin:0;font-weight:800" }, last.label),
              last.note ? el("p", { class: "muted", style: "margin:4px 0 0" }, `« ${last.note} »`) : null,
            ),
          ),
        )
      : el("div", { class: "card", style: "margin-top:16px;text-align:center" },
          el("p", { class: "muted", style: "margin:0 0 12px" }, "Tu n'as pas encore noté ton humeur aujourd'hui."),
          el("button", { class: "btn btn--primary", onclick: () => navigate("mood") }, "Commencer maintenant"),
        ),

    el("p", { class: "disclaimer", style: "margin-top:22px" },
      "Havre est un espace de soutien, pas un service médical. En cas de détresse, appelle le ",
      el("a", { href: "tel:3114", style: "color:var(--pink);font-weight:800" }, "3114"),
      " (24h/24, gratuit)."),
  );
}

function quickAction(icon, title, sub, onClick) {
  return el("button", { class: "qa", onclick: onClick },
    el("span", { class: "qa__icon" }, icon),
    el("span", { class: "qa__title" }, title),
    el("span", { class: "qa__sub" }, sub),
  );
}
function stat(num, lbl) {
  return el("div", { class: "stat" },
    el("div", { class: "stat__num" }, String(num)),
    el("div", { class: "stat__lbl" }, lbl),
  );
}
