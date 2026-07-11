/* store.js — Persistance locale (privacy-first).
   Toutes les données de l'utilisateur restent dans le navigateur.
   Aucune donnée n'est envoyée sur un serveur. */

const KEY = "havre.state.v1";

const DEFAULT = {
  profile: { name: "", onboarded: false, theme: null },
  moods: [],        // { id, ts, key, label, emoji, color, note }
  journal: [],      // { id, ts, text, moodEmoji }
  chat: [],         // { role: "bot"|"me", text, ts }
  stats: { breaths: 0, lastVisit: null, streak: 0 },
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULT);
    const parsed = JSON.parse(raw);
    return { ...clone(DEFAULT), ...parsed,
      profile: { ...DEFAULT.profile, ...(parsed.profile || {}) },
      stats: { ...DEFAULT.stats, ...(parsed.stats || {}) } };
  } catch {
    return clone(DEFAULT);
  }
}

let state = load();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { /* quota / mode privé : on ignore silencieusement */ }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const store = {
  get: () => state,
  get profile() { return state.profile; },

  setProfile(patch) { state.profile = { ...state.profile, ...patch }; persist(); },

  addMood(entry) {
    const m = { id: uid(), ts: Date.now(), ...entry };
    state.moods.push(m); persist(); return m;
  },
  moods: () => state.moods.slice().sort((a, b) => a.ts - b.ts),
  lastMood: () => state.moods.length ? state.moods[state.moods.length - 1] : null,

  addJournal(entry) {
    const j = { id: uid(), ts: Date.now(), ...entry };
    state.journal.unshift(j); persist(); return j;
  },
  journal: () => state.journal.slice(),
  removeJournal(id) { state.journal = state.journal.filter((e) => e.id !== id); persist(); },

  chat: () => state.chat.slice(),
  addChat(role, text) {
    state.chat.push({ role, text, ts: Date.now() });
    if (state.chat.length > 200) state.chat = state.chat.slice(-200);
    persist();
  },
  clearChat() { state.chat = []; persist(); },

  addBreath(cycles = 1) { state.stats.breaths += cycles; persist(); },
  stats: () => state.stats,

  /** Met à jour la série de jours consécutifs (streak). */
  touchVisit() {
    const today = new Date().toDateString();
    const last = state.stats.lastVisit;
    if (last === today) return state.stats.streak;
    const yest = new Date(Date.now() - 864e5).toDateString();
    state.stats.streak = last === yest ? (state.stats.streak || 0) + 1 : 1;
    state.stats.lastVisit = today;
    persist();
    return state.stats.streak;
  },

  reset() { state = clone(DEFAULT); persist(); },
};
