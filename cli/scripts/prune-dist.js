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

const { rmSync, existsSync } = require("fs");
const { join } = require("path");

const DIST = join(__dirname, "..", "dist");

const toRemove = [
  "src/ui/types/state.js",
  "src/shared/presets/presets.json",
  "src/shared/presets/raw",
  "src/shared/presets/themeShop.js",
  "src/shared/presets/validatePreset.js",
];

for (const rel of toRemove) {
  const full = join(DIST, rel);
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true });
    console.log(`pruned ${rel}`);
  }
}
