/* ============================================================
   companion.js — Le moteur conversationnel de Havre.

   100 % local, sans clé API, sans réseau : tout le raisonnement
   se fait dans le navigateur. L'objectif n'est PAS d'imiter un
   thérapeute, mais d'offrir une écoute chaleureuse, d'aider à
   nommer les émotions, et d'orienter vers de l'aide humaine
   quand c'est nécessaire.

   Ordre de traitement (la sécurité passe toujours en premier) :
     1. Détresse / risque suicidaire  -> réponse de soin + ressources
     2. Haine / violence envers autrui -> limite ferme et bienveillante
     3. Contenu explicite / harcèlement -> recadrage doux
     4. Émotions & intentions          -> écoute active variée
   ============================================================ */

/* ---------- Ressources d'aide (France, gratuites & confidentielles) ---------- */
export const RESOURCES = [
  { label: "3114 — Prévention du suicide (24h/24, 7j/7, gratuit)", href: "tel:3114" },
  { label: "Fil Santé Jeunes — 0 800 235 236 (anonyme, gratuit)", href: "tel:0800235236" },
  { label: "Urgences : 15 (SAMU) ou 112", href: "tel:112" },
];

/* ---------- Normalisation du texte ---------- */
function norm(s = "") {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // enleve les accents
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ").trim();
}
const has = (t, arr) => arr.some((k) => t.includes(k));

/* ---------- Anti-répétition + variété ---------- */
const lastUsed = new Map();
function pick(key, pool) {
  if (pool.length === 1) return pool[0];
  let i, guard = 0;
  do { i = Math.floor(Math.random() * pool.length); guard++; }
  while (pool[i] === lastUsed.get(key) && guard < 8);
  lastUsed.set(key, pool[i]);
  return pool[i];
}
const maybe = (p) => Math.random() < p;

/* ============================================================
   1. DÉTRESSE / RISQUE SUICIDAIRE
   ============================================================ */
const CRISIS = [
  "envie de mourir", "veux mourir", "veux plus vivre", "plus envie de vivre",
  "envie d en finir", "en finir avec la vie", "en finir avec tout", "me suicider",
  "suicide", "me tuer", "plus la force de vivre", "mieux sans moi",
  "monde serait mieux sans moi", "serait mieux sans moi", "me faire du mal",
  "automutil", "me scarifier", "veux disparaitre", "plus etre la",
  "a quoi bon vivre", "peux plus vivre", "je veux plus vivre", "tout arreter pour toujours",
  "personne ne pleurerait", "personne me regretterait",
];

function crisisReply(ctx) {
  const name = ctx.name ? ` ${ctx.name}` : "";
  const openers = [
    `Merci de m'avoir confié ça${name}. Ce que tu ressens compte énormément, et tu ne devrais pas rester seul·e avec une douleur aussi lourde.`,
    `Je t'entends${name}, et je prends tes mots très au sérieux. Ce que tu traverses a l'air vraiment très difficile à porter.`,
    `Ce que tu dis me touche${name}. Tu comptes, et ta vie a de la valeur — même quand tout semble sombre en ce moment.`,
  ];
  const bridge = pick("crisis-bridge", [
    "Je ne suis qu'un compagnon numérique, alors je ne peux pas remplacer une vraie présence humaine — mais des personnes formées peuvent t'écouter tout de suite, gratuitement et sans jugement :",
    "Tu mérites de parler à quelqu'un de bien réel, maintenant. Des personnes bienveillantes sont disponibles à chaque instant pour toi :",
  ]);
  const close = pick("crisis-close", [
    "Si tu es en danger immédiat, appelle le 15 ou le 112. Tu n'as pas à traverser ça seul·e. 💜",
    "Y a-t-il une personne de confiance près de toi que tu pourrais appeler ou rejoindre là, maintenant ? Je reste là avec toi. 💜",
  ]);
  return { kind: "crisis", html: `${pick("crisis-open", openers)}<br><br>${bridge}`, resources: RESOURCES, close };
}

/* ============================================================
   2. HAINE / VIOLENCE ENVERS AUTRUI  (politique stricte)
   ============================================================ */
// Liste de modération : uniquement destinée au filtrage des propos haineux.
const HATE_SLURS = [
  "negre", "bougnoul", "pd ", " pd", "tapette", "sale juif", "sale arabe",
  "sale noir", "sale blanc", "sale rebeu", "youpin", "bicot", "chinetoq",
];
const HATE_PATTERNS = [
  "je hais les", "je deteste les", "mort aux", "faut tuer", "faut buter",
  "retourne dans ton pays", "rentre dans ton pays", "tous des sales",
  "sont des sous hommes", "race inferieure", "sale race", "on devrait tous les",
  "faut les exterminer", "faut virer tous les", "tous les musulmans sont",
  "tous les juifs sont", "tous les noirs sont", "tous les arabes sont",
  "les femmes sont toutes des", "je veux frapper", "je vais te frapper",
  "je vais te tuer", "sale pute",
];
function isHate(t) { return has(t, HATE_SLURS) || has(t, HATE_PATTERNS); }

function hateReply(ctx) {
  return {
    kind: "boundary",
    html: pick("hate", [
      "Là, je ne peux pas te suivre. Havre est un espace où <strong>personne n'est rabaissé</strong> — chaque personne y a sa place et sa dignité.",
      "Je vais m'arrêter ici : je ne soutiendrai jamais des propos qui blessent ou humilient des gens. Chaque personne compte, sans exception.",
      "Je ne peux pas t'accompagner sur ce terrain. Le respect de chacun·e n'est pas négociable ici.",
    ]) + "<br><br>" + pick("hate2", [
      "S'il y a de la colère ou de la douleur derrière ces mots, je suis vraiment là pour ça — on peut en parler autrement. Qu'est-ce qui se passe pour toi en ce moment&nbsp;?",
      "Parfois ce genre de mots cache autre chose — de la frustration, une blessure. Si tu veux, dis-moi plutôt ce que tu ressens, toi.",
    ]),
  };
}

/* ============================================================
   3. CONTENU EXPLICITE / HARCÈLEMENT
   ============================================================ */
const EXPLICIT = ["sexe", "porn", "nude", "bite", "chatte ", "penetr", "baiser ", "envoie nudes"];
function explicitReply() {
  return {
    kind: "boundary",
    html: pick("explicit", [
      "Ce n'est pas vraiment mon domaine 😊 Je suis là pour tes émotions et ton bien-être. On repart de là&nbsp;?",
      "Je ne suis pas le bon espace pour ça. Mais si quelque chose te pèse ou t'agite, ça oui, je veux bien en parler avec toi. 💜",
    ]),
  };
}

/* ============================================================
   4. ÉMOTIONS & INTENTIONS
   ============================================================ */
const NEG = ["pas", "plus", "jamais", "aucun", "ni ", "sans", "rien", "mauvais", "mal", "nul"];
function negatedWellbeing(t) {
  // « ça va pas », « je vais pas bien », « pas la forme »
  return /(ca va (pas|plus)|vais (pas|plus) bien|pas la forme|pas le moral|ca va mal|va pas fort)/.test(t);
}

const EMOTIONS = [
  {
    key: "tristesse",
    words: ["triste", "malheureu", "deprim", "pleur", "cafard", "morose", "chagrin", "peine", "decourag", "le moral", "broie du noir", "vide", "down"],
    suggest: "journal",
    pool: [
      "Je suis désolé que tu te sentes comme ça. La tristesse, ça pèse lourd — et tu as le droit de la ressentir sans te justifier. Qu'est-ce qui l'a réveillée&nbsp;?",
      "Ça a l'air vraiment lourd à porter en ce moment. Je suis là, tu peux tout poser. Depuis quand ça dure&nbsp;?",
      "Merci de me le dire. Rien que mettre des mots dessus, c'est déjà quelque chose. Tu veux me raconter ce qui te rend triste&nbsp;?",
    ],
  },
  {
    key: "anxiete",
    words: ["anxi", "angoiss", "stress", "panique", "inquiet", "nerv", "tendu", "oppress", "boule au ventre", "overthink", "rumin", "peur", "flippe", "trac"],
    suggest: "breathe",
    pool: [
      "L'anxiété, c'est épuisant — comme un moteur qui ne s'arrête jamais. Ton ressenti est légitime. Est-ce qu'il y a quelque chose de précis qui tourne dans ta tête&nbsp;?",
      "Respire, tu es en sécurité ici. Une chose à la fois. Qu'est-ce qui t'angoisse le plus là, maintenant&nbsp;?",
      "Quand ça monte comme ça, le corps s'emballe avant les pensées. On peut ralentir ensemble si tu veux. Tu arrives à mettre un mot sur cette peur&nbsp;?",
    ],
  },
  {
    key: "colere",
    words: ["colere", "enerv", "rage", "furieu", "injuste", "j en ai marre", "degout", "agac", "frustr", "ras le bol", "ca m enerve"],
    suggest: "breathe",
    pool: [
      "Ta colère a le droit d'exister — souvent, elle protège quelque chose d'important pour toi. Qu'est-ce qui t'a blessé ou paru injuste&nbsp;?",
      "Ok, tu as l'air vraiment remonté·e, et ça se comprend. Vas-y, déballe — qu'est-ce qui s'est passé&nbsp;?",
      "La colère, c'est de l'énergie. On peut regarder ce qu'il y a dessous ensemble. Contre quoi ou qui elle est dirigée&nbsp;?",
    ],
  },
  {
    key: "solitude",
    words: ["seul", "solitude", "personne", "isole", "abandonn", "exclu", "incompris", "ignore", "invisible", "delaisse"],
    suggest: "journal",
    pool: [
      "Se sentir seul·e, c'est l'une des sensations les plus dures — et pourtant là, tu n'es pas tout à fait seul·e : je t'écoute vraiment. Qu'est-ce qui te donne ce sentiment&nbsp;?",
      "Merci de m'avoir dit ça. La solitude peut être immense même entouré·e de monde. Tu veux m'en parler&nbsp;?",
      "Je suis là, et ce que tu ressens compte pour moi. Depuis quand tu te sens à l'écart&nbsp;?",
    ],
  },
  {
    key: "fatigue",
    words: ["fatigue", "epuise", "creve", "burnout", "plus de force", "insomnie", "dormir", "sommeil", "au bout du rouleau", "lessive", "vanne"],
    suggest: "breathe",
    pool: [
      "Tu sembles vraiment vidé·e. Le repos n'est pas une récompense, c'est un besoin — tu as le droit de souffler. C'est ton corps ou ta tête qui est le plus fatigué&nbsp;?",
      "L'épuisement, ça brouille tout. Sois doux·ce avec toi aujourd'hui. Qu'est-ce qui te prend le plus d'énergie en ce moment&nbsp;?",
      "Être au bout, ça arrive quand on a trop tenu, trop longtemps. Qu'est-ce qui t'empêche de te reposer&nbsp;?",
    ],
  },
  {
    key: "ecole",
    words: ["exam", "controle", "note", "revision", "prof", "ecole", "fac", "cours", "partiel", "orientation", "echec", "redoubl", "parcoursup", "bac ", "brevet", "diplome"],
    suggest: "breathe",
    pool: [
      "La pression scolaire peut être écrasante — mais ta valeur ne se résume pas à une note. Qu'est-ce qui t'inquiète le plus&nbsp;?",
      "Je comprends, cette charge-là est réelle. Une étape à la fois. C'est quoi le prochain truc qui te stresse&nbsp;?",
      "Tu fais de ton mieux, et c'est déjà beaucoup. Qu'est-ce qui rendrait la prochaine semaine un peu plus légère&nbsp;?",
    ],
  },
  {
    key: "estime",
    words: ["je suis nul", "je suis rate", "incapable", "je me deteste", "honte", "pas assez", "je vaux rien", "je sers a rien", "je suis moche", "degueulasse", "je suis bete"],
    suggest: "journal",
    pool: [
      "Hé, je t'arrête doucement : la voix qui te dit ça n'est pas la vérité, c'est la douleur qui parle. Tu es bien plus que tes pires pensées sur toi-même. Qu'est-ce qui te fait douter comme ça&nbsp;?",
      "Ce que tu dis de toi est très dur — et je ne suis pas d'accord avec cette voix-là. Qu'est-ce qui s'est passé pour que tu te juges aussi sévèrement&nbsp;?",
      "Tu mérites la même douceur que celle que tu offrirais à un·e ami·e. Dis-m'en plus&nbsp;: d'où vient ce sentiment&nbsp;?",
    ],
  },
  {
    key: "coeur",
    words: ["rupture", "mon ex", "coeur brise", "rejet", "plaqu", "largu", "crush", "chagrin d amour", "il m a quitte", "elle m a quitte", "peine de coeur"],
    suggest: "journal",
    pool: [
      "Un cœur qui fait mal, c'est une vraie douleur, pas une exagération. Prends le temps qu'il te faut. Tu veux me raconter ce qui s'est passé&nbsp;?",
      "Les peines de cœur, ça remue tout. Je suis là pour t'écouter, sans te presser. Comment tu te sens là, maintenant&nbsp;?",
      "Ça fait mal, et c'est normal que ça fasse mal — ça voulait dire quelque chose pour toi. Qu'est-ce qui est le plus dur en ce moment&nbsp;?",
    ],
  },
  {
    key: "reseaux",
    words: ["insta", "tiktok", "snap", "les likes", "comparer", "trop d ecran", "scroll", "followers", "reseaux sociaux", "je me compare", "filtre"],
    suggest: "journal",
    pool: [
      "Les réseaux montrent les moments parfaits des autres, jamais leurs galères — te comparer à ça, c'est une course truquée d'avance. Qu'est-ce qui te pèse le plus là-dedans&nbsp;?",
      "Ce que tu vois défiler n'est pas la réalité, c'est une vitrine. Et toi, tu vaux bien plus qu'un nombre de likes. Comment ça t'affecte au quotidien&nbsp;?",
      "Reposer les yeux et le mental de tout ce flux, ça fait un bien fou. Tu as remarqué quand tu te sens le moins bien en scrollant&nbsp;?",
    ],
  },
  {
    key: "joie",
    words: ["content", "heureu", "trop bien", "super", "genial", "la joie", "je suis fier", "j ai reussi", "motive", "gratitude", "excellente", "ca va bien", "je vais bien", "le sourire"],
    pool: [
      "Oh, ça fait tellement plaisir à lire&nbsp;! 🌟 Savoure ce moment, tu le mérites. Qu'est-ce qui te rend heureux·se comme ça&nbsp;?",
      "Yes&nbsp;! J'adore. Ces instants-là méritent qu'on s'y arrête. Raconte-moi ce qui va bien&nbsp;!",
      "C'est une super nouvelle 💛 Garder une trace de ces moments, ça aide les jours plus gris. Tu veux le noter dans ton journal&nbsp;?",
    ],
  },
];

/* ---------- Intentions conversationnelles ---------- */
function intentReply(t, ctx) {
  const name = ctx.name ? ` ${ctx.name}` : "";

  if (/(^| )(bonjour|salut|coucou|hello|hey|yo|bonsoir|cc|wesh)( |$)/.test(t)) {
    return { kind: "normal", html: pick("hi", [
      `Coucou${name} 🙂 Je suis content que tu sois là. Comment tu te sens aujourd'hui&nbsp;?`,
      `Hey${name}&nbsp;! Contente de te voir. Qu'est-ce qui t'amène&nbsp;? Comment va ton cœur aujourd'hui&nbsp;?`,
      `Salut${name} 💜 Je suis là, tranquillement. Dis-moi comment tu vas, vraiment.`,
    ]) };
  }
  if (/(merci|thanks|thank you|c est gentil|ca fait du bien)/.test(t)) {
    return { kind: "normal", html: pick("thx", [
      "Avec plaisir, vraiment 💜 Je suis là quand tu veux.",
      "De rien. Tu peux revenir me parler à n'importe quel moment, sans condition.",
      "Ça me touche. Prends soin de toi, une chose à la fois. 🌿",
    ]) };
  }
  if (/(au revoir|a plus|bye|bonne nuit|a bientot|salut je pars|ciao)/.test(t)) {
    return { kind: "normal", html: pick("bye", [
      `Prends soin de toi${name}. Je serai là quand tu reviendras. 🌙`,
      "À très vite. Sois doux·ce avec toi d'ici là 💜",
      "Repose-toi bien. Tu as fait quelque chose de bien juste en venant parler.",
    ]) };
  }
  if (/(qui es tu|t es qui|tu es quoi|c est quoi havre|tu es un robot|tu es une ia|es tu humain)/.test(t)) {
    return { kind: "normal", html:
      "Je suis <strong>le compagnon de Havre</strong> — un espace d'écoute qui vit entièrement dans ton téléphone, sans envoyer tes mots à qui que ce soit. " +
      "Je ne suis pas humain et je ne remplace pas un·e professionnel·le, mais je suis là pour t'écouter sans jugement, t'aider à y voir clair et te proposer des petits exercices. Comment tu te sens, là&nbsp;?" };
  }
  if (/(aide moi|besoin d aide|je sais pas quoi faire|que faire|un exercice|calme moi|technique|comment faire pour)/.test(t)) {
    return { kind: "normal", suggest: "breathe", html: pick("help", [
      "Je suis là. On peut commencer tout doucement — parfois, ralentir la respiration aide le mental à suivre. Tu veux essayer un exercice de respiration guidé&nbsp;? Ou tu préfères juste me parler d'abord&nbsp;?",
      "On va faire ça ensemble, sans pression. Dis-moi ce qui te pèse le plus en ce moment — et si tu veux, on peut aussi passer par un petit exercice pour t'apaiser.",
    ]) };
  }
  if (/^(oui|non|ok|d accord|je sais pas|peut etre|mouais|bof|ca va)$/.test(t.trim())) {
    return { kind: "normal", html: pick("mini", [
      "Je t'écoute, prends ton temps. Qu'est-ce qui se passe dans ta tête là&nbsp;?",
      "D'accord 🙂 Dis-m'en un peu plus quand tu te sens prêt·e.",
      "Ok. Et si tu devais mettre un mot sur ton humeur du moment, ce serait lequel&nbsp;?",
    ]) };
  }
  return null;
}

/* ---------- Écoute active de repli (jamais robotique) ---------- */
function fallbackReply() {
  return { kind: "normal", html: pick("fallback", [
    "Je t'écoute. Continue, je suis là — qu'est-ce que ça te fait de le dire&nbsp;?",
    "Merci de partager ça avec moi. Tu veux m'en dire un peu plus&nbsp;?",
    "Je comprends. Et toi, comment tu te sens par rapport à tout ça&nbsp;?",
    "Ça a l'air important pour toi. Qu'est-ce qui compte le plus là-dedans, à tes yeux&nbsp;?",
    "Je suis là, sans jugement. Si tu devais résumer ce que tu ressens en une émotion, ce serait quoi&nbsp;?",
    "D'accord, je te suis. Qu'est-ce qui t'aiderait à te sentir un peu mieux, là, maintenant&nbsp;?",
  ]) };
}

/* ============================================================
   API PUBLIQUE
   ============================================================ */

/** Message d'accueil du compagnon (personnalisé selon l'humeur du jour). */
export function welcome(ctx = {}) {
  const name = ctx.name ? ` ${ctx.name}` : "";
  if (ctx.lastMood && Date.now() - ctx.lastMood.ts < 6 * 3600e3) {
    return `Coucou${name} ${ctx.lastMood.emoji} Tu as noté te sentir « ${ctx.lastMood.label.toLowerCase()} » un peu plus tôt. Je suis là si tu veux en parler — ou juste souffler ensemble.`;
  }
  return pick("welcome", [
    `Coucou${name} 💜 Ici, c'est ton espace. Tout ce que tu écris reste sur ton appareil, rien n'est partagé. Comment tu te sens vraiment aujourd'hui&nbsp;?`,
    `Hey${name}, je suis le compagnon de Havre. Pas de jugement ici, jamais. Qu'est-ce qui se passe pour toi en ce moment&nbsp;?`,
  ]);
}

/** Génère une réponse à partir du texte de l'utilisateur. */
export function reply(userText, ctx = {}) {
  const t = norm(userText);
  if (!t) return fallbackReply();

  // 1 & 2 & 3 : sécurité d'abord.
  if (has(t, CRISIS)) return crisisReply(ctx);
  if (isHate(t)) return hateReply(ctx);
  if (has(t, EXPLICIT)) return explicitReply();

  // « ça va pas » -> traité comme de la détresse douce (tristesse).
  if (negatedWellbeing(t)) {
    const e = EMOTIONS.find((x) => x.key === "tristesse");
    return { kind: "normal", suggest: e.suggest, html: pick("negwell", [
      "Merci d'être honnête. Ça ne va pas, et c'est ok de le dire ici. Qu'est-ce qui pèse le plus en ce moment&nbsp;?",
      "Je te crois, et je suis là. Tu veux me raconter ce qui ne va pas&nbsp;?",
    ]) };
  }

  // 4 : émotion la plus saillante (score par nombre de mots-clés touchés).
  let best = null, bestScore = 0;
  for (const emo of EMOTIONS) {
    const score = emo.words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = emo; }
  }
  if (best && bestScore > 0) {
    let html = pick(best.key, best.pool);
    if (ctx.name && maybe(0.35)) html = `${ctx.name}, ` + html.charAt(0).toLowerCase() + html.slice(1);
    return { kind: "normal", suggest: best.suggest || null, html };
  }

  // Intentions conversationnelles.
  const intent = intentReply(t, ctx);
  if (intent) return intent;

  // Repli : écoute active.
  return fallbackReply();
}

/** Suggestions de réponses rapides pour lancer/relancer la discussion. */
export const QUICK_REPLIES = [
  "Je me sens stressé·e",
  "J'ai le moral à zéro",
  "Je me sens seul·e",
  "Trop de pression en ce moment",
  "En fait ça va plutôt bien",
];
