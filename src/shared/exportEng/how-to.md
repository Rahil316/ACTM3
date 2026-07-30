# Writing a "script" export target

The `"script"` format is the lightest-weight way to customize Token Wand's
CLI output: you write a plain `.js` file with one function, point
`wand.config.json` at it, and the CLI calls that function with the same
pre-resolved color/token data every built-in formatter in this folder
(`fmtCSS.ts`, `fmtReactNative.ts`, etc.) already receives. There is no
template language and no config schema to learn — if you can write
JavaScript, you can write a script export.

## The one important warning

Every other part of `wand.config.json` is inert data — `cli/src/loadConfig.ts`
reads it as plain JSON, on purpose, precisely so a `.wand`+config handoff
from a designer to a developer never means "run unknown code." **A
`"script"` target is the one deliberate exception.** The file you point
`scriptFile` at is **`require()`'d and executed** by the CLI, with full
Node.js access (filesystem, network, environment variables — everything a
normal Node script can do). Only point `scriptFile` at a file you wrote or
fully trust, the same way you'd vet any other code dependency in your
project.

## Quick start

**1. Write the script** (`tokens.script.js`):

```js
// tokens.script.js
module.exports = function (ctx) {
  const lines = [":root {"];
  for (const token of ctx.tokens) {
    if (token.theme !== "light") continue;
    const name = token.segs.map((s) => s.label).join("-");
    lines.push(`  --${name}: ${token.value};`);
  }
  lines.push("}");
  return lines.join("\n");
};
```

**2. Point a target at it** (`wand.config.json`):

```json
{
  "wandFile": "./project.wand",
  "targets": [
    { "format": "script", "outDir": "./src/tokens", "scriptFile": "./tokens.script.js" }
  ]
}
```

**3. Run the build** — same as any other target:

```
npx token-wand build
```

That's the whole mechanism. Everything below is about what `ctx` contains
and the handful of rules your function needs to follow.

## `.ts` support depends on your Node version

The CLI doesn't ship `ts-node`/`tsx` or any TypeScript loader of its own —
it just calls `require()` on `scriptFile` and reports whatever actually
happens. Whether that succeeds for a `.ts` file depends entirely on the
Node runtime actually running the CLI, not on this package:

- **Node 22.6+** (unflagged by default on newer versions) has built-in
  TypeScript support — a `.ts` script with real type annotations,
  `interface`s, etc. just works, with zero setup on your end.
- **Older Node**, with no loader registered, can't parse real TypeScript
  syntax — you'll get a clear error naming the problem and your options,
  not a silent failure or a confusing raw stack trace.

If you're on older Node, two ways around it, both entirely under your own
control:

- **Compile your `.ts` file to `.js`** before running the build (e.g. with
  `tsc` in your own project, or your existing build tooling), and point
  `scriptFile` at the compiled output.
- **Register your own TypeScript loader** before invoking the CLI, e.g.:
  ```
  node --require ts-node/register ./node_modules/.bin/token-wand build
  ```
  (requires `ts-node` — or `tsx`, or any other loader — as a dependency in
  *your* project; this package deliberately doesn't ship one.)

Either way, plain `.js`/`.cjs` scripts always work, on every supported Node
version, with no caveats.

## Type-checked authoring

The published package ships real types for `ctx` under
`@rahil316/token-wand/script` — real autocomplete and type errors, in
either a `.ts` file or a plain `.js` file:

```ts
// TypeScript
import type { ScriptExportContext } from "@rahil316/token-wand/script";
export default function (ctx: ScriptExportContext): string { /* ... */ }
```

```js
// Plain JavaScript, via a JSDoc annotation — no build step needed, your
// editor's TS language server still checks it
/** @param {import("@rahil316/token-wand/script").ScriptExportContext} ctx */
module.exports = function (ctx) { /* ... */ };
```

Either form needs `"moduleResolution": "node16" | "nodenext" | "bundler"`
in your own `tsconfig.json` (or your editor's default) for the
`@rahil316/token-wand/script` subpath to resolve — the older `"node"`
resolver predates `package.json` `"exports"` support and can't see it (and
will say so directly if you try: `types...could not be resolved under your
current 'moduleResolution' setting`).

You can still write the script in TypeScript for your own editing
experience even on older Node — only the file the CLI actually loads at
*build* time needs to run somewhere (see above); writing/type-checking it
is a separate, always-available concern.

## Your function's signature

```ts
export default function (ctx: ScriptExportContext): string | ScriptExportFile[] {
  // ...
}
```

(`export default` if you compile from TS/ESM; `module.exports = function
(ctx) {...}` if you write plain CommonJS `.js` directly — both work, the
CLI checks for either.)

**Return a `string`** for a single file. Its content becomes the one file
written for this target, at `outDir` (the CLI names it `output` unless you
give it a different name via `fileNames: {"output": "..."}` in the target).

**Return an array of `{ path, content }`** for more than one file from one
script — the React-Native-formatter pattern (a themed file per theme, plus
an index file that imports all of them):

```js
module.exports = function (ctx) {
  const themes = [...new Set(ctx.tokens.map((t) => t.theme))];
  const files = themes.map((theme) => ({
    path: `${theme}.ts`,
    content: renderTheme(ctx, theme),
  }));
  files.push({ path: "index.ts", content: renderIndex(themes) });
  return files;
};
```

Each `path` is relative to the target's `outDir` — you fully control the
filename and any subdirectory structure (e.g. `path: "res/values-night/colors.xml"`
for Android-style qualifier directories).

## `ScriptExportContext` — everything your function receives

```ts
interface ScriptExportContext {
  result: EngineResult;       // the raw, unlabeled engine output — rarely needed directly
  config: ExportConfig;        // the resolved project settings (see below)
  tokens: ResolvedToken[];      // every (color, role, variation, theme) combination — YOUR MAIN INPUT
  scaleSteps: ResolvedScaleStep[]; // every (color, step) combination — empty if the project isn't in Scale mode
  sourceColors: SourceColorEntry[]; // every declared brand/source color (+ alpha variants)
}
```

This is exactly the same pre-resolved data every built-in formatter in this
folder already works from — `resolve.ts`'s `resolveExport()`/
`resolveScaleSteps()` and `helpers.ts`'s `_eachSourceColor()`, called once
before your function ever runs. You never need to touch `EngineResult`'s
raw, unlabeled shape directly unless you have a specific reason to.

### `ResolvedToken` — one entry per (color, role, variation, theme)

```ts
interface ResolvedToken {
  theme: string;                 // e.g. "light", "dark" — always lowercase
  segs: TokenSegment[];           // the token's name, already split into labeled parts,
                                  // already in the project's declared segment order
  value: string;                 // the resolved color, as a hex string (e.g. "#0F998A")
  tokenRef: string | null;        // set when this token is an ALIAS into a scale step
                                  // (Scale mode only) — "{colorName}-{stepName}", e.g. "Primary-500"
  isAdjusted?: boolean;            // true if the solver had to settle for a best-effort value
  contrast: { ratio: number | null; rating: "Fail" | "AA-" | "AA" | "AAA" | null };
  colorName: string;               // the RAW (unlabeled) color name — use this to group/key by
                                    // original identity; segs[].label is already display-formatted
  roleId: string;                  // the role's raw id/key
}

type TokenSegment = { type: "color" | "role" | "variation"; label: string };
```

A typical name-building line:

```js
const name = token.segs.map((s) => s.label).join("-"); // e.g. "primary-text-default"
```

`segs` already reflects the project's `tokenNameSegments` order and any
shorthand settings (`useShorthandColors`/`Roles`/`Variations`) — you don't
need to re-derive naming yourself unless you want a different convention
than the project's own default.

### `ResolvedScaleStep` — one entry per (color, step), Scale mode only

```ts
interface ResolvedScaleStep {
  colorName: string;   // raw color name
  cLabel: string;       // the color's already-labeled display name (shorthand-aware)
  stepKey: string;      // already through the project's step-naming (e.g. "500")
  value: string;        // resolved color, hex
  description: string;  // "" if descriptions are off for this project
}
```

Empty (`scaleSteps.length === 0`) in a Direct-mode project — that's normal,
not an error; check `scaleSteps.length` before assuming scale data exists.

### `SourceColorEntry` — one entry per declared brand/source color

```ts
interface SourceColorEntry {
  colorName: string;
  cLabel: string;
  hex: string;
  description: string;
  alphaVariants: { opacity: number; description: string; rgba: { r: number; g: number; b: number; a: number } }[];
}
```

Empty (`sourceColors.length === 0`) unless the project has
`includeSourceColors` turned on.

### `ExportConfig` — the resolved project settings

```ts
interface ExportConfig {
  name?: string;
  colors?: Color[];
  roles?: Record<string, Role>;
  variations?: Variation[];
  useShorthandColors?: boolean;
  useShorthandRoles?: boolean;
  useShorthandVariations?: boolean;
  useShorthandSteps?: boolean;
  tokenNameSegments?: string[];
  includeDescriptions?: boolean;
  includeColorScalesCollection?: boolean;
  includeSourceColors?: boolean;
  alphaValues?: number[];
  // ...see types.ts for the full, current shape
}
```

You'll rarely need to read this directly — `tokens`/`scaleSteps`/
`sourceColors` are already built from it — but it's there if your template
needs to branch on a project-level setting (e.g. `config.name` for a file
header).

## Checks the CLI performs for you

Before your function ever runs, and after it returns, the CLI catches the
mistakes that would otherwise silently produce a broken or empty file:

- **`scriptFile` doesn't exist** → a clear config error, build stops before
  touching the project's data.
- **`scriptFile` is a `.ts` file your Node runtime can't parse** (real
  TypeScript syntax, no built-in support, no loader registered) → a clear
  error naming your Node version and the fix, not a raw `SyntaxError`.
- **The file has no usable default export** (wrong file, or you used a
  named export instead of `export default`/`module.exports =`) → a clear
  error naming the problem.
- **Your function's return value isn't a `string` or a well-formed
  `{path, content}[]`** (e.g. you forgot a `return`, or one array entry is
  missing `content`) → a clear error, never a file silently written with
  `"undefined"` as its content.

**What's intentionally *not* caught for you**: if your own script logic
throws (a real bug in your code — a typo, a null you didn't expect), that
error propagates with your own real stack trace. The CLI doesn't wrap or
disguise it, since doing so would hide exactly the information you need to
fix it.

## A complete, realistic example

A minimal React-Native-style export — one typed object per theme, plus an
index file — written as a plain script instead of using a built-in format:

```js
// rn-tokens.script.js
function camel(s) {
  return s.replace(/-([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
}

function renderTheme(ctx, theme) {
  const lines = [`export const ${theme}Tokens = {`];
  for (const token of ctx.tokens) {
    if (token.theme !== theme) continue;
    const key = camel(token.segs.map((s) => s.label).join("-"));
    lines.push(`  ${key}: ${JSON.stringify(token.value)},`);
  }
  lines.push("} as const;");
  return lines.join("\n");
}

module.exports = function (ctx) {
  const themes = [...new Set(ctx.tokens.map((t) => t.theme))];
  const files = themes.map((theme) => ({ path: `${theme}.ts`, content: renderTheme(ctx, theme) }));
  files.push({
    path: "index.ts",
    content: themes.map((t) => `export * from './${t}';`).join("\n"),
  });
  return files;
};
```

```json
{ "format": "script", "outDir": "./src/tokens", "scriptFile": "./rn-tokens.script.js" }
```
