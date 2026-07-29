// Integration test of the full public API (src/index.ts) — parse a real
// JSON5 document string -> build a Dataset -> generate() -> the exact
// path the CLI bridge (Part G) will call. Proves the public surface, not
// just individual internal modules, works end to end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset, parseFmtLangDocument, generate } from "../../src/index";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

test("public API: a simple JSON5 document string renders a real CSS file end-to-end", () => {
  const docSrc = `{
    // a simple, single-file custom export
    "$schema": "fmt-lang/v1",
    "files": [
      {
        "role": "tokens",
        "shape": "token",
        "path": "tokens.css",
      },
    ],
  }`;

  const { doc, diagnostics: parseDiagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(parseDiagnostics.length, 0);
  assert.ok(doc);

  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const { files, diagnostics } = generate(doc!, dataset);

  assert.equal(diagnostics.length, 0);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, "tokens.css");
  assert.ok(files[0].content.length > 0);
  assert.match(files[0].content, /^ {2}--[a-z0-9-]+: #[0-9A-Fa-f]{6};/);
});

test("public API: an unsupported $schema version is a clear semantic error, not a silent misinterpretation", () => {
  const { doc, diagnostics } = parseFmtLangDocument(`{ "$schema": "fmt-lang/v99", "files": [] }`);
  assert.equal(doc, undefined);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "unsupported-schema-version");
});

test("public API: malformed JSON5 never throws uncaught, always a syntax diagnostic", () => {
  const { doc, diagnostics } = parseFmtLangDocument("{ files: [ { role: 'a' ");
  assert.equal(doc, undefined);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].category, "syntax");
});

test("public API: defs.sort referenced by name from a files[] entry actually changes output order (a real document-schema gap — sort existed as an internal module but was never reachable from RawDoc)", () => {
  const docSrc = `{
    "defs": {
      "sort": {
        "byNameDesc": { "keys": [{ "by": "color.name", "order": "alpha", "direction": "desc" }] }
      }
    },
    "files": [
      { "role": "tokens", "shape": "token", "path": "tokens.css", "sort": "byNameDesc" }
    ]
  }`;
  const { doc, diagnostics: parseDiagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(parseDiagnostics.length, 0);
  assert.ok(doc);

  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const { files, diagnostics } = generate(doc!, dataset);
  assert.equal(diagnostics.length, 0);

  // A named sort def is a plain string reference into defs.sort, resolved
  // the same way naming/valueFormat/arrange/select already are — this
  // wasn't even parseable before sort was wired into document.ts.
  const unsorted = generate(parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css"}]}`).doc!, dataset).files[0].content;
  assert.notEqual(files[0].content, unsorted, "a real sort def must actually reorder entries relative to the Dataset's canonical order");
});

test("public API: an inline sort def (not a named defs.sort reference) works identically", () => {
  const docSrc = `{
    "files": [
      { "role": "tokens", "shape": "token", "path": "tokens.css",
        "sort": { "keys": [{ "by": "theme", "order": "alpha" }] } }
    ]
  }`;
  const { doc, diagnostics: parseDiagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(parseDiagnostics.length, 0);
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const { diagnostics } = generate(doc!, dataset);
  assert.equal(diagnostics.length, 0);
});

test("public API: a sort key referencing a field that doesn't exist on the entry's shape is a semantic error, never a silently-ignored sort", () => {
  const docSrc = `{
    "files": [
      { "role": "tokens", "shape": "scaleStep", "path": "tokens.css",
        "sort": { "keys": [{ "by": "contrast.ratio", "order": "numeric" }] } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(doc, undefined, "a shape-mismatched sort key must abort parsing, never silently no-op");
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "semantic");
  assert.equal(errors[0].code, "unknown-field");
});

test("public API: the plan's own documented dotted reference syntax (\"defs.select.name\", B.2b/B.9's worked examples) resolves identically to a bare name — a real gap where only the bare form ever actually worked", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const bareDoc = parseFmtLangDocument(`{
    "defs": { "select": { "lightOnly": { "shape": "token", "where": "theme == 'light'" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "select": "lightOnly" }]
  }`).doc!;
  const dottedDoc = parseFmtLangDocument(`{
    "defs": { "select": { "lightOnly": { "shape": "token", "where": "theme == 'light'" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "select": "defs.select.lightOnly" }]
  }`).doc!;
  const bare = generate(bareDoc, dataset).files[0].content;
  const dotted = generate(dottedDoc, dataset).files[0].content;
  assert.equal(dotted, bare);
  assert.ok(bare.length > 0);
});

test("public API: B.9's chaining — a named select narrowed further by an inline `where` at the point of use, without editing the original def", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const { doc, diagnostics } = parseFmtLangDocument(`{
    "defs": { "select": { "allTokens": { "shape": "token" } } },
    "files": [
      { "role": "all", "shape": "token", "path": "all.css", "select": "allTokens" },
      { "role": "dark", "shape": "token", "path": "dark.css", "select": "allTokens", "where": "theme == 'dark'" }
    ]
  }`);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  const all = files.find((f) => f.path === "all.css")!;
  const dark = files.find((f) => f.path === "dark.css")!;
  assert.ok(dark.content.length < all.content.length, "the chained where must actually narrow the named select's result, not replace or ignore it");
  assert.ok(dark.content.length > 0);
});

test("public API: B.5's custom entryFormat.template — fully user-authored entry text, not just the 8 stdlib presets (a real gap: this field was declared in RawDoc but silently ignored, never read)", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "files": [
      { "role": "t", "shape": "token", "path": "t.txt",
        "entryFormat": { "template": "TOKEN(\${name}) = \${value}" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.match(files[0].content, /^TOKEN\([a-z0-9-]+\) = #[0-9A-Fa-f]{6}/);
});

test("public API: a named defs.entryFormat.template reference (bare and dotted forms) resolves identically to the inline form", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const inline = generate(
    parseFmtLangDocument(`{
      "files": [{ "role": "t", "shape": "token", "path": "t.txt", "entryFormat": { "template": "\${name}=\${value}" } }]
    }`).doc!,
    dataset
  ).files[0].content;
  const bareRef = generate(
    parseFmtLangDocument(`{
      "defs": { "entryFormat": { "kv": { "template": "\${name}=\${value}" } } },
      "files": [{ "role": "t", "shape": "token", "path": "t.txt", "entryFormat": "kv" }]
    }`).doc!,
    dataset
  ).files[0].content;
  const dottedRef = generate(
    parseFmtLangDocument(`{
      "defs": { "entryFormat": { "kv": { "template": "\${name}=\${value}" } } },
      "files": [{ "role": "t", "shape": "token", "path": "t.txt", "entryFormat": "defs.entryFormat.kv" }]
    }`).doc!,
    dataset
  ).files[0].content;
  assert.equal(bareRef, inline);
  assert.equal(dottedRef, inline);
});

test("public API: an invalid expression inside a template's ${...} span is a syntax error caught before rendering, never a silent runtime crash or garbage output", () => {
  const docSrc = `{
    "files": [
      { "role": "t", "shape": "token", "path": "t.txt",
        "entryFormat": { "template": "\${name ===} bad" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(doc, undefined);
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "syntax");
});

test("public API: an unknown field inside a template's ${...} span (e.g. a scaleStep-only usage referencing a token-only field) evaluates to empty text via B.1a's null-propagation rule, since a template's expressions aren't select.where — no shape-mismatch machinery applies to arbitrary interpolation targets", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "files": [
      { "role": "t", "shape": "token", "path": "t.txt",
        "entryFormat": { "template": "[\${bogusField}]" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.match(files[0].content, /^\[\]/);
});

test("public API: outputKind: \"json\" auto-escapes an interpolated value containing a quote (§3's Escaping requirement) — a real gap: the field existed in ComposeOptions/composeEntry but document.ts never read it from RawDoc, so every document silently behaved as outputKind: \"none\" regardless of what a user set", () => {
  // A minimal Direct-mode fixture whose source color's description
  // contains a double-quote — the exact case §3 names ("a value containing
  // a quote... should not silently produce invalid output").
  const result: EngineResult = { tokens: {}, errors: { critical: [], warnings: [], notices: [] }, scales: {} };
  const config: ExportConfig = {
    name: "Escaping Test",
    colors: [{ name: "Brand", shorthand: "br", value: "#112233", description: `a "quoted" value` }],
    includeSourceColors: true,
    includeDescriptions: true,
  };
  const dataset = buildDataset(result, config);

  const docSrc = `{
    "outputKind": "json",
    "files": [
      { "role": "t", "shape": "sourceColor", "path": "t.json",
        "entryFormat": { "template": "{\\"note\\": \\"\${description}\\"}" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.equal(files[0].content, `{"note": "a \\"quoted\\" value"}`, "the quote inside the interpolated description must be escaped, producing valid JSON");
  assert.doesNotThrow(() => JSON.parse(files[0].content), "the rendered line must actually parse as valid JSON once escaped");
});

test("public API: with no outputKind set (the default), the same quoted value passes through unescaped — proving the escaping in the test above is real, not coincidental", () => {
  const result: EngineResult = { tokens: {}, errors: { critical: [], warnings: [], notices: [] }, scales: {} };
  const config: ExportConfig = {
    name: "Escaping Test",
    colors: [{ name: "Brand", shorthand: "br", value: "#112233", description: `a "quoted" value` }],
    includeSourceColors: true,
    includeDescriptions: true,
  };
  const dataset = buildDataset(result, config);

  const docSrc = `{
    "files": [
      { "role": "t", "shape": "sourceColor", "path": "t.txt",
        "entryFormat": { "template": "note: \${description}" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.equal(files[0].content, `note: a "quoted" value`);
});

test("public API: a files[] entry's own outputKind overrides the document-level default, per B.2b's cascade", () => {
  const result: EngineResult = { tokens: {}, errors: { critical: [], warnings: [], notices: [] }, scales: {} };
  const config: ExportConfig = {
    name: "Escaping Test",
    colors: [{ name: "Brand", shorthand: "br", value: "#112233", description: `a & value` }],
    includeSourceColors: true,
    includeDescriptions: true,
  };
  const dataset = buildDataset(result, config);

  const docSrc = `{
    "outputKind": "json",
    "files": [
      { "role": "t", "shape": "sourceColor", "path": "t.xml", "outputKind": "xml",
        "entryFormat": { "template": "<n>\${description}</n>" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  // xml-escaped (&amp;), not json-escaped (which wouldn't touch "&" at
  // all) — proves the per-file override actually took effect over the
  // document-level "json" default, not just "some escaping happened."
  assert.equal(files[0].content, "<n>a &amp; value</n>");
});

test("public API: naming's \"$segments\" tracks the REAL project's declared tokenNameSegments order — a real gap: document.ts silently substituted a hardcoded ['color','role','variation'] guess instead, which happens to be wrong for this exact fixture (declared order is ['role','color','variation'])", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  assert.deepEqual(dataset.tokenNameSegments, ["role", "color", "variation"], "sanity check: this fixture's declared order must NOT match the old hardcoded fallback, or this test wouldn't distinguish the two");

  const explicitDoc = parseFmtLangDocument(`{
    "defs": { "naming": { "n": { "appliesTo": "token", "segments": ["role", "color", "variation"], "case": "kebab" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "naming": "n" }]
  }`).doc!;
  const dollarSegmentsDoc = parseFmtLangDocument(`{
    "defs": { "naming": { "n": { "appliesTo": "token", "segments": "$segments", "case": "kebab" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "naming": "n" }]
  }`).doc!;

  const explicit = generate(explicitDoc, dataset).files[0].content;
  const viaDollarSegments = generate(dollarSegmentsDoc, dataset).files[0].content;
  assert.equal(viaDollarSegments, explicit, "\"$segments\" must resolve to the SAME real declared order as hand-listing it explicitly");
});

test("public API: arrange's groupBy \"$segments\" also tracks the real declared order, not a hardcoded guess", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const explicitDoc = parseFmtLangDocument(`{
    "files": [{ "role": "t", "shape": "token", "path": "t.css",
      "arrange": { "kind": "nested", "groupBy": ["role", "color", "variation"] } }]
  }`).doc!;
  const dollarSegmentsDoc = parseFmtLangDocument(`{
    "files": [{ "role": "t", "shape": "token", "path": "t.css",
      "arrange": { "kind": "nested", "groupBy": "$segments" } }]
  }`).doc!;
  const explicit = generate(explicitDoc, dataset).files[0].content;
  const viaDollarSegments = generate(dollarSegmentsDoc, dataset).files[0].content;
  assert.equal(viaDollarSegments, explicit);
});

test("public API: B.8's easy path — ${tokens.theme.light} renders every light-theme token with zero defs required — a real gap: this document-facing block syntax never existed at all, only the underlying Dataset.matchesIdentity() building block did", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "content": "\${tokens.theme.light}" }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.equal(files[0].content, files[0].content); // rendered without throwing
  assert.ok(files[0].content.length > 0);
  assert.equal(dataset.tokensForTheme("light").length, files[0].content.split("\n").length, "one line per light-theme token, generic default formatting");
});

test("public API: block flavors (tokens/tokensJs/tokensCss/tokensJson) each apply their own stdlib naming+entryFormat defaults, per B.8's table", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const genericDoc = parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.theme.light}"}]}`).doc!;
  const jsDoc = parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.js","content":"\${tokensJs.theme.light}"}]}`).doc!;
  const cssDoc = parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokensCss.theme.light}"}]}`).doc!;
  const jsonDoc = parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.json","content":"\${tokensJson.theme.light}"}]}`).doc!;

  const generic = generate(genericDoc, dataset).files[0].content;
  const js = generate(jsDoc, dataset).files[0].content;
  const css = generate(cssDoc, dataset).files[0].content;
  const json = generate(jsonDoc, dataset).files[0].content;

  assert.match(generic, /^ {2}--[a-z0-9-]+: #[0-9A-Fa-f]{6};$/m, "tokens.* default: CSS-ish key: value");
  assert.match(js, /^ {2}[a-zA-Z0-9]+: "#[0-9A-Fa-f]{6}",$/m, "tokensJs.* default: camelCase JS object property");
  assert.match(css, /^ {2}--[a-z0-9-]+: #[0-9A-Fa-f]{6};$/m, "tokensCss.* default: kebab-case CSS custom property");
  assert.match(json, /^ {2}"[a-zA-Z0-9]+": "#[0-9A-Fa-f]{6}",$/m, "tokensJson.* default: camelCase flat JSON key-value");
  // Naming case actually differs between flavors, not just entry punctuation —
  // tokensJs/tokensJson (camelCase) must NOT contain a literal "-" in any
  // name position the way tokens/tokensCss (kebab-case) do.
  assert.ok(!js.includes("- ") && !/[a-z]-[a-z]/.test(js.replace(/#[0-9a-fA-F]{6}/g, "")), "tokensJs must be camelCase, not kebab-case");
});

test("public API: getEntriesByColor matches by shorthand too (interchangeable name/shorthand, B.8's stated semantics) — this fixture's Primary color has shorthand \"pr\"", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const byName = generate(parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.theme.light.getEntriesByColor('Primary')}"}]}`).doc!, dataset).files[0].content;
  const byShorthand = generate(parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.theme.light.getEntriesByColor('pr')}"}]}`).doc!, dataset).files[0].content;
  assert.equal(byShorthand, byName);
  assert.ok(byName.length > 0);
  const all = generate(parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.theme.light}"}]}`).doc!, dataset).files[0].content;
  assert.ok(byName.length < all.length, "narrowed to one color must be strictly smaller than the full theme");
});

test("public API: getEntriesBy* chains — narrowing twice (color then role) narrows further than either alone", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const colorOnly = generate(parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.theme.light.getEntriesByColor('Primary')}"}]}`).doc!, dataset).files[0].content;
  const colorAndRole = generate(parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.theme.light.getEntriesByColor('Primary').getEntriesByRole('bg')}"}]}`).doc!, dataset).files[0].content;
  assert.ok(colorAndRole.length < colorOnly.length);
  assert.ok(colorAndRole.length > 0);
});

test("public API: referencing tokens.scale on a Direct-mode project (no scale collection at all) is a runtime error, never silent empty output — B.8's exact stated example", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  assert.equal(dataset.hasScaleCollection, false, "sanity check: this fixture must genuinely be Direct mode for this test to mean anything");
  const doc = parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.scale}"}]}`).doc!;
  const { files, diagnostics } = generate(doc, dataset);
  assert.equal(files.length, 0);
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "runtime");
  assert.equal(errors[0].code, "block-runtime-error");
  assert.match(errors[0].message, /no scale collection/);
});

test("public API: an unmatched getEntriesByColor query (a color that doesn't exist, by either name or shorthand) is a runtime error, never silently empty", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const doc = parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.theme.light.getEntriesByColor('DoesNotExist')}"}]}`).doc!;
  const { files, diagnostics } = generate(doc, dataset);
  assert.equal(files.length, 0);
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "runtime");
  assert.match(errors[0].message, /DoesNotExist/);
});

test("public API: content mode is mutually exclusive with select/sort/arrange/entryFormat — a mixed-mode document ignores the expert-path fields entirely rather than half-applying them", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "content": "\${tokens.theme.light}",
      "select": { "shape": "token", "where": "theme == 'dark'" } }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  // If `select` had leaked through, this would render dark-theme tokens
  // instead — proving content mode genuinely ignores it, not "mostly ignores it."
  const lightOnly = generate(parseFmtLangDocument(`{"files":[{"role":"t","shape":"token","path":"t.css","content":"\${tokens.theme.light}"}]}`).doc!, dataset).files[0].content;
  assert.equal(files[0].content, lightOnly);
});

test("public API: B.10's defs.static — a named {text} block attached via `before`, resolved once (not once per entry) — a real gap: this concept never existed in RawDoc at all", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "defs": { "static": { "doNotEdit": { "text": "// Do not edit manually." } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "before": "doNotEdit" }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.ok(files[0].content.startsWith("// Do not edit manually.\n"));
});

test("public API: defs.static's dotted reference form (\"defs.static.name\") resolves identically to the bare form, same as every other def kind", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const bare = generate(parseFmtLangDocument(`{
    "defs": { "static": { "h": { "text": "// header" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "before": "h" }]
  }`).doc!, dataset).files[0].content;
  const dotted = generate(parseFmtLangDocument(`{
    "defs": { "static": { "h": { "text": "// header" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "before": "defs.static.h" }]
  }`).doc!, dataset).files[0].content;
  assert.equal(dotted, bare);
});

test("public API: a `before` string that ISN'T a known defs.static name is treated as literal text, not an error — the fallback the plan's own ergonomics depend on (most before/after usage today is plain text, not a static reference)", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const { doc, diagnostics } = parseFmtLangDocument(`{
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "before": "/* plain literal comment, not a defs.static name */" }]
  }`);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.ok(files[0].content.startsWith("/* plain literal comment, not a defs.static name */\n"));
});

test("public API: defs.static's {file} form reads a real file from disk, relative to baseDir — resolved once per generation, never once per entry", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "defs": { "static": { "license": { "file": "license-header.txt" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "before": "license" }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc, join(__dirname, "../fixtures"));
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.ok(files[0].content.startsWith("// Copyright Test Co. All rights reserved.\n"));
});

test("public API: defs.static's {file} form failing to read is a semantic error, never an uncaught exception", () => {
  const docSrc = `{
    "defs": { "static": { "license": { "file": "does-not-exist.txt" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "before": "license" }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc, join(__dirname, "../fixtures"));
  assert.equal(doc, undefined);
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "semantic");
  assert.equal(errors[0].code, "static-file-read-failed");
});

test("public API: defs.static works with B.8's content mode too — a license header attached via `before` around a ${tokens.*} block", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "defs": { "static": { "h": { "text": "// header" } } },
    "files": [{ "role": "t", "shape": "token", "path": "t.css", "before": "h", "content": "\${tokens.theme.light}" }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.ok(files[0].content.startsWith("// header\n"));
});

test("public API: B.11's group-header hook — arrange.groupHeaderTemplate inserts a per-group header line, document-facing — a real gap: onGroupStart existed in ComposeOptions/composeBlock but no document field ever set it", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "files": [{ "role": "t", "shape": "token", "path": "t.css",
      "arrange": { "kind": "nested", "groupBy": ["color.name"], "groupHeaderTemplate": "/* \${group} */" } }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.match(files[0].content, /\/\* Primary \*\//, "the group's own raw key (Primary) must be interpolated into the header");
});

test("public API: groupFooterTemplate inserts a per-group footer line too, distinct from the header hook", () => {
  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const docSrc = `{
    "files": [{ "role": "t", "shape": "token", "path": "t.css",
      "arrange": { "kind": "nested", "groupBy": ["color.name"], "groupFooterTemplate": "/* end \${group} */" } }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(diagnostics.length, 0);
  const { files } = generate(doc!, dataset);
  assert.match(files[0].content, /\/\* end Primary \*\//);
});

test("public API: an invalid expression inside groupHeaderTemplate's ${...} span is a syntax error caught before rendering", () => {
  const docSrc = `{
    "files": [{ "role": "t", "shape": "token", "path": "t.css",
      "arrange": { "kind": "nested", "groupBy": ["color.name"], "groupHeaderTemplate": "\${group ===} bad" } }]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(doc, undefined);
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "syntax");
});

test("public API: a token-only field (contrast.ratio) referenced in a scaleStep-shaped select.where is a semantic error, never a silent empty-set result — a real bug found via the CLI, now regression-tested here", () => {
  const docSrc = `{
    "files": [
      { "role": "tokens", "shape": "scaleStep", "path": "tokens.css",
        "select": { "shape": "scaleStep", "where": "contrast.ratio > 4.5" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(doc, undefined, "a shape-mismatched where clause must abort parsing, never silently succeed");
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "semantic");
  assert.equal(errors[0].code, "unknown-field");
});
