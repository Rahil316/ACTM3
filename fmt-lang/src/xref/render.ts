// Renders every file entry in dependency order (resolveOrder.ts), threading
// each already-rendered node's real content/name back into later nodes'
// {{files.<role>.*}} references before they render — Part D's core
// guarantee: cross-references always see final content, never a
// placeholder. This is Phase 3's "orchestration without full validation
// layering yet" (the plan's own phrasing) — Phase 4 adds the diagnostic
// categorization on top of this same flow.
import type { Dataset } from "../data/dataset";
import type { AnyRecord } from "../data/shapes";
import type { FileEntry, RenderedFileInstance } from "./fileEntry";
import { planGeneration, type ExpandedNode } from "./resolveOrder";
import { renderFile, type RenderFileInput } from "../pipeline/stages";
import type { SegmentKind } from "../lang/defs/naming";
import { interpolateTemplate } from "../lang/expr";
import { buildBlockSet } from "../lang/blocks";

// A real gap found closing the document schema against the plan: B.3/B.7's
// "$segments" (a naming/arrange def tracking the project's own declared
// tokenNameSegments order, instead of the template author hand-listing
// color/role/variation again) can only be resolved against a real Dataset —
// but document.ts's parseFmtLangDocument() runs before any Dataset exists
// (Part E: syntax/semantic validation is deliberately Dataset-agnostic).
// This is the one place in the pipeline that legitimately has both the
// still-unresolved def AND the real Dataset at the same time, so it's where
// the substitution actually happens — document.ts only ever preserves the
// literal "$segments" marker through parsing, never guesses a fallback for it.
function resolveDatasetSegments(render: NonNullable<FileEntry["render"]>, dataset: Dataset): NonNullable<FileEntry["render"]> {
  const declaredSegments = dataset.tokenNameSegments as SegmentKind[];
  const resolveSegments: RenderFileInput["compose"]["resolveSegments"] = (def) => {
    if (def.segments === "$segments") return declaredSegments;
    return Array.isArray(def.segments) ? def.segments : declaredSegments;
  };
  const arrange = render.arrange.groupBy === "$segments"
    ? { ...render.arrange, groupBy: declaredSegments as string[] }
    : render.arrange;
  return { ...render, arrange, compose: { ...render.compose, resolveSegments } };
}

function recordsForShape(dataset: Dataset, shape: FileEntry["shape"], loopValue: string | undefined): readonly AnyRecord[] {
  switch (shape) {
    case "token": return loopValue !== undefined ? dataset.tokensForTheme(loopValue) : dataset.tokens;
    case "scaleStep": return dataset.scaleSteps;
    case "sourceColor": return dataset.sourceColors;
    case "sourceAlpha": return dataset.sourceAlphas;
  }
}

// Substitutes {{files.<role>.content}} / {{files.<role>.name}} (a single,
// non-repeated earlier role) and {{files.<role>.each}}...{{/files.<role>.each}}
// (a repeatFor earlier role — once per instance, exposing item.theme/
// item.name/item.content) — using only ALREADY-RENDERED nodes (guaranteed
// by generation order), never a forward reference.
function substituteFileRefs(text: string, rendered: Map<string, RenderedFileInstance[]>): string {
  let out = text;
  out = out.replace(/\{\{files\.([a-zA-Z0-9_-]+)\.each\}\}([\s\S]*?)\{\{\/files\.\1\.each\}\}/g, (_m, role: string, body: string) => {
    const instances = rendered.get(role) ?? [];
    return instances
      .map((inst) =>
        body
          .replace(/\{\{item\.theme\}\}/g, inst.loopValue ?? "")
          .replace(/\{\{item\.name\}\}/g, inst.path)
          .replace(/\{\{item\.content\}\}/g, inst.content)
      )
      .join("");
  });
  out = out.replace(/\{\{files\.([a-zA-Z0-9_-]+)\.(content|name)\}\}/g, (_m, role: string, form: string) => {
    const instances = rendered.get(role) ?? [];
    const single = instances[0];
    if (!single) return "";
    return form === "content" ? single.content : single.path;
  });
  return out;
}

export function renderAllFiles(entries: FileEntry[], dataset: Dataset): RenderedFileInstance[] {
  const { order, nodesById } = planGeneration(entries, dataset);
  const renderedByRole = new Map<string, RenderedFileInstance[]>();
  const results: RenderedFileInstance[] = [];

  for (const id of order) {
    const node = nodesById.get(id) as ExpandedNode;
    const records = recordsForShape(dataset, node.entry.shape, node.loopValue);

    const pathWithRefs = substituteFileRefs(node.entry.path, renderedByRole);
    // A real gap found re-reading §2's "file naming and location must be as
    // customizable as the file's content": this used to be a hardcoded
    // "${theme}" regex-replace — no expressions, no conditionals — so a
    // path pattern needing logic (e.g. Android's REAL qualifier-directory
    // convention: the first declared theme gets no suffix regardless of its
    // name, "dark" gets "values-night", everything else gets "values-
    // <slug>") could not be expressed at all. `path` now goes through the
    // SAME interpolateTemplate() content/before/after/entryFormat.template
    // already use, with the repeatFor loop variable (named by `as`, default
    // "theme") and its 0-based position (`<as>Index`) available as vars.
    const loopVarName = node.entry.repeatFor?.as ?? "theme";
    // The repeatFor loop variable (and its 0-based position, "<as>Index")
    // must be available EVERYWHERE a template can reference it — path,
    // AND content/before/after — not just path. A real gap found alongside
    // the path-templating fix above: content's own interpolateTemplate call
    // only ever passed buildBlockSet(dataset) as vars, so a repeatFor
    // entry's own loop variable (e.g. "${tokens.getEntriesByTheme(theme)}")
    // resolved to undefined/null inside its OWN content template.
    const loopVars = node.loopValue !== undefined ? { [loopVarName]: node.loopValue, [`${loopVarName}Index`]: node.loopIndex } : {};
    const path = node.loopValue !== undefined ? interpolateTemplate(pathWithRefs, { vars: loopVars }) : pathWithRefs;

    // B.8's easy path — a whole-file literal template with ${tokens.*}-
    // style block interpolation — is mutually exclusive with the expert
    // path's select+sort+arrange+entryFormat combination (Part G's
    // "content" field, see fileEntry.ts). Block objects are only ever built
    // here (render time), never at parse time, for the same reason
    // "$segments" resolution lives here — they need the real Dataset.
    const content = node.entry.contentTemplate !== undefined
      ? interpolateTemplate(node.entry.contentTemplate, { vars: { ...buildBlockSet(dataset), ...loopVars } })
      : renderFile({ ...resolveDatasetSegments(node.entry.render!, dataset), records });
    const contentWithRefs = substituteFileRefs(content, renderedByRole);

    const instance: RenderedFileInstance = { role: node.role, loopValue: node.loopValue, path, content: contentWithRefs };
    results.push(instance);
    let list = renderedByRole.get(node.role);
    if (!list) { list = []; renderedByRole.set(node.role, list); }
    list.push(instance);
  }

  return results;
}
