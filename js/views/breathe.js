/* breathe.js — Exercices de respiration guidés (animation de l'orbe). */
import { store } from "../store.js";
import { el, toast } from "../ui.js";

const TECHNIQUES = {
  box: { name: "Carrée (4-4-4-4)", desc: "Équilibre et concentration.", phases: [
    { label: "Inspire", dur: 4, scale: 1 }, { label: "Retiens", dur: 4, scale: 1 },
    { label: "Expire", dur: 4, scale: .6 }, { label: "Retiens", dur: 4, scale: .6 } ] },
  relax: { name: "Apaisante (4-7-8)", desc: "Idéale pour s'endormir ou calmer l'anxiété.", phases: [
    { label: "Inspire", dur: 4, scale: 1 }, { label: "Retiens", dur: 7, scale: 1 },
    { label: "Expire", dur: 8, scale: .55 } ] },
  calm: { name: "Cohérence (5-5)", desc: "Régule le cœur et le stress.", phases: [
    { label: "Inspire", dur: 5, scale: 1 }, { label: "Expire", dur: 5, scale: .58 } ] },
};

export function renderBreathe(root) {
  let techKey = "box";
  let running = false;
  let cycles = 0;
  let timer = null;

  const orb = el("div", { class: "orb" }, el("span", { class: "orb__label" }, "Prêt·e ?"));
  const count = el("div", { class: "breath-count" }, "");
  const phaseLbl = el("div", { class: "breath-phase" }, "Installe-toi confortablement");
  const startBtn = el("button", { class: "btn btn--primary", style: "min-width:150px" }, "Commencer");

  const techRow = el("div", { class: "tech-row" });
  const techButtons = {};
  Object.entries(TECHNIQUES).forEach(([k, t]) => {
    const b = el("button", { class: "chip" + (k === techKey ? " is-active" : "") }, t.name);
    b.addEventListener("click", () => { if (running) return; techKey = k; updateTech(); });
    techButtons[k] = b; techRow.append(b);
  });
  const techDesc = el("p", { class: "muted", style: "margin:2px 0 0;font-size:.9rem;text-align:center" }, TECHNIQUES[techKey].desc);

  function updateTech() {
    Object.entries(techButtons).forEach(([k, b]) => b.classList.toggle("is-active", k === techKey));
    techDesc.textContent = TECHNIQUES[techKey].desc;
  }

  function stop(done) {
    running = false; clearTimeout(timer); timer = null;
    orb.style.setProperty("--orb-scale", ".62");
    orb.style.setProperty("--phase-dur", ".6s");
    orb.querySelector(".orb__label").textContent = done ? "Bravo 🌿" : "Prêt·e ?";
    count.textContent = ""; phaseLbl.textContent = done ? `${cycles} cycle(s) — tu peux le refaire quand tu veux.` : "Installe-toi confortablement";
    startBtn.textContent = "Commencer";
    if (done && cycles > 0) { store.addBreath(cycles); toast("Beau moment pour toi 🫁"); }
    cycles = 0;
  }

  function runPhase(phases, i) {
    if (!running) return;
    const phase = phases[i];
    if (i === 0) cycles++;
    orb.style.setProperty("--phase-dur", phase.dur + "s");
    orb.style.setProperty("--orb-scale", phase.scale);
    orb.querySelector(".orb__label").textContent = phase.label;
    phaseLbl.textContent = phase.label + "…";

    let remaining = phase.dur;
    count.textContent = remaining;
    const tick = () => {
      if (!running) return;
      remaining--;
      if (remaining > 0) { count.textContent = remaining; timer = setTimeout(tick, 1000); }
      else runPhase(phases, (i + 1) % phases.length);
    };
    timer = setTimeout(tick, 1000);

    if (cycles > 12) return stop(true); // garde-fou
  }

  startBtn.addEventListener("click", () => {
    if (running) { stop(true); return; }
    running = true; cycles = 0; startBtn.textContent = "Terminer";
    runPhase(TECHNIQUES[techKey].phases, 0);
  });

  root.append(
    el("p", { class: "eyebrow" }, "Respire"),
    el("h1", { class: "h1" }, "Ralentis, ", el("span", { class: "gradient-text" }, "juste un instant")),
    el("p", { class: "muted", style: "margin:0 0 8px" }, "Suis l'orbe des yeux : il grandit quand tu inspires, il s'apaise quand tu expires."),
    el("div", { class: "card" },
      el("div", { class: "breathe-stage" },
        el("div", { class: "orb-wrap" }, el("div", { class: "orb-ring" }), orb),
        count, phaseLbl, startBtn,
      ),
    ),
    el("div", { class: "card", style: "margin-top:16px" },
      el("p", { class: "eyebrow", style: "text-align:center;margin-bottom:10px" }, "Choisis ton rythme"),
      techRow, techDesc,
    ),
  );

  // Nettoyage si on quitte la vue.
  root.addEventListener("view:leave", () => stop(false), { once: true });
}
