/* build.mjs — Assemble les fichiers statiques dans dist/.
   Aucune transformation : Havre est déjà du web natif (pas de bundler).
   Ce dossier dist/ sert à la fois de cible GitHub Pages et de webDir Capacitor. */
import { rm, mkdir, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const FILES = ["index.html", "manifest.webmanifest", "sw.js"];
const DIRS = ["css", "js", "assets"];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const f of FILES) {
  if (existsSync(join(ROOT, f))) await cp(join(ROOT, f), join(DIST, f));
}
for (const d of DIRS) {
  if (existsSync(join(ROOT, d))) await cp(join(ROOT, d), join(DIST, d), { recursive: true });
}

// Fichier .nojekyll pour que GitHub Pages serve les dossiers commençant par _ etc.
await cp(join(ROOT, "index.html"), join(DIST, "index.html"));
const { writeFile } = await import("node:fs/promises");
await writeFile(join(DIST, ".nojekyll"), "");

console.log("✅ Build terminé →", DIST);
