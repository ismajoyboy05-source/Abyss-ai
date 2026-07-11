# 🌿 Havre — ton espace pour souffler

> Un compagnon de bien-être émotionnel pour la génération connectée.
> **Privé, gratuit, sans jugement.** Tout reste sur ton appareil.

Havre répond à un besoin essentiel et documenté de la nouvelle génération :
**comprendre et réguler ses émotions** dans un monde saturé de notifications,
de comparaison sociale et de pression permanente. C'est un havre de calme —
pensé pour des jeunes qui vivent en ligne, mais qui ont besoin d'un espace où
personne ne les note, ne les classe et ne revend leurs données.

---

## ✨ Ce que fait l'application

| Espace | Ce qu'il apporte |
|---|---|
| **Aujourd'hui** | Accueil personnalisé, pensée du jour, séries d'assiduité et accès rapides. |
| **Humeur** | Nommer son émotion parmi une palette expressive + historique visuel (petite « météo intérieure »). |
| **Respire** | Exercices de respiration guidés interactifs (carrée 4-4-4-4, apaisante 4-7-8, cohérence cardiaque) avec une orbe animée. |
| **Journal** | Journal intime guidé par des questions douces, 100 % local. |
| **Compagnon** | Un chatbot conversationnel chaleureux, **sans clé API**, avec une politique de sécurité stricte. |

## 💬 Le Compagnon : chaleureux, mais sûr

Le compagnon fonctionne **entièrement dans le navigateur**, sans aucun appel
réseau ni clé API (`js/companion.js`). Il ne prétend jamais remplacer un·e
professionnel·le. Sa priorité absolue est la sécurité, dans cet ordre :

1. **Détresse / risque suicidaire** → réponse de soin, jamais banalisante, avec
   des ressources d'aide réelles et gratuites (3114, Fil Santé Jeunes, 15/112).
2. **Haine ou violence envers autrui** → limite ferme et bienveillante, refus
   d'alimenter les propos, invitation à parler de ce qu'il y a « dessous ».
3. **Contenu explicite / harcèlement** → recadrage doux.
4. **Émotions** (tristesse, anxiété, colère, solitude, épuisement, pression
   scolaire, estime de soi, peine de cœur, réseaux sociaux, joie…) → écoute
   active, réponses variées et humaines, suggestions d'exercices.

Les réponses sont puisées dans des banques de formulations et anti-répétées
pour ne jamais paraître robotiques ; le prénom de l'utilisateur est utilisé
avec parcimonie pour un ton naturel.

## 🔒 Éthique & vie privée

- **Aucun compte, aucun serveur, aucun tracker.** Toutes les données (humeurs,
  journal, conversations) vivent dans le `localStorage` du navigateur.
- **Transparence** : un avertissement rappelle que Havre est un soutien, pas un
  service médical, et affiche les numéros d'urgence.
- **Accessibilité** : contrastes soignés, navigation clavier, support de
  `prefers-reduced-motion`, thèmes clair/sombre.

## 📱 Progressive Web App (installable / mobile)

Havre est une **PWA** : `manifest.webmanifest` + `sw.js` (service worker).
- Installable sur l'écran d'accueil (iOS/Android/desktop) — s'ouvre en plein
  écran comme une app native.
- Fonctionne **hors-ligne** une fois chargée.
- Transformable en app mobile native via [Capacitor](https://capacitorjs.com/)
  ou [PWABuilder](https://www.pwabuilder.com/) sans réécriture.

## 🚀 Lancer en local

Aucune dépendance, aucune étape de build. Sers simplement le dossier :

```bash
python3 -m http.server 8501
# puis ouvre http://localhost:8501
```

Ou avec Node : `npx serve .`

## 🗂️ Structure

```
index.html               · coquille de l'app (shell)
manifest.webmanifest     · métadonnées PWA
sw.js                    · service worker (hors-ligne)
css/styles.css           · design system « Aurora calm »
assets/                  · icônes SVG
js/
  app.js                 · routeur, thème, onboarding, PWA
  store.js               · persistance locale (privacy-first)
  ui.js                  · aides d'interface
  companion.js           · moteur conversationnel + sécurité
  views/                 · today · mood · breathe · journal · chat
```

## 🎨 Direction artistique

« **Aurora calm** » : profondeur nocturne, dégradés violet → rose → menthe,
verre dépoli (glassmorphism), aurores animées en fond, coins très arrondis,
micro-interactions douces. Une identité rassurante et contemporaine, pensée
mobile-first.

---

*Havre ne collecte rien, ne juge personne, et rappelle toujours qu'une aide
humaine existe. En cas de détresse : **3114** (24h/24, 7j/7, gratuit).*
