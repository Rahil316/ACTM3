// Generates every export format (CSS/SCSS/Tailwind/DTCG/Style Dictionary/
// Swift/Android/React Native/CSV/JSON/.wand) against a curated set of
// ProjectStore configuration permutations — Scale vs Direct mode, scale
// collection on/off, source colors + alpha tints, shorthand naming, segment
// ordering, description inclusion, single vs multi-theme, non-standard theme
// names. Each fixture is small (2 colors x 2 roles x 2 variations x <=2
// themes) — enough depth to exercise every formatter code path without
// generating hundreds of tokens per format.
//
// Fully standalone: no build step, imports directly from src/, self-contained
// results under export-test/results/.
//
// Run: npx tsx export-test/run.ts                    # every fixture
//      npx tsx export-test/run.ts scale-basic direct-basic

import { main as runExportTest } from "./scripts/run-export-test";

runExportTest();
