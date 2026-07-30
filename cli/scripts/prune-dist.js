// Removes compiled files from dist/ that are only there because
// src/ui/types/state.ts has a *value* re-export of PRESETS (from
// themeShop.ts, which requires presets.json at load time) — nothing in this
// CLI's runtime require() graph actually loads state.js/themeShop.js/
// presets.json/preset raw files, since the CLI only ever imports
// ProjectStore's *type*. That type-only import is enough to pull state.ts
// into tsc's program (and therefore emit state.js with its own real
// require()), but not enough to make anything actually call require() on it
// at runtime. Confirmed by grepping the compiled dist/ output for
// require("./state")-style calls before adding this step — re-check that if
// this ever starts failing silently (i.e. if something legitimately starts
// needing PRESETS at runtime, this script would break it).
//
// package.json's "files"/.npmignore can't express this exclusion themselves:
// when "files" is set, .npmignore is ignored entirely, and "files" doesn't
// reliably support negated globs — hence a real prune step instead.
//
// state.js itself (not just themeShop.js/validatePreset.js) is pruned too,
// which is why state.d.ts's own `export { PRESETS } from "./themeShop"`
// value re-export is harmless despite themeShop.js/.d.ts both being deleted
// below — nothing can ever require() state.js (it doesn't exist), so that
// dangling value export is never actually reachable at runtime. state.d.ts
// ITSELF is kept — real code imports ProjectStore's type from it.
//
// declaration: true (added alongside the "script" format's own published
// types, see cli/package.json's "./script" export) started emitting .d.ts
// files for themeShop.ts/validatePreset.ts too, alongside the .js files
// this list already pruned — dead weight in the published tarball with no
// real consumer (confirmed: nothing imports a type from either file
// directly, only through state.ts's own already-covered re-export).

const { rmSync, existsSync } = require("fs");
const { join } = require("path");

const DIST = join(__dirname, "..", "dist");

const toRemove = [
  "src/ui/types/state.js",
  "src/shared/presets/presets.json",
  "src/shared/presets/raw",
  "src/shared/presets/themeShop.js",
  "src/shared/presets/themeShop.d.ts",
  "src/shared/presets/validatePreset.js",
  "src/shared/presets/validatePreset.d.ts",
];

for (const rel of toRemove) {
  const full = join(DIST, rel);
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true });
    console.log(`pruned ${rel}`);
  }
}
