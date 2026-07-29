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
import { renderFile } from "../pipeline/stages";

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
    const path = node.loopValue !== undefined ? pathWithRefs.replace(/\$\{theme\}/g, node.loopValue) : pathWithRefs;

    const content = renderFile({ ...node.entry.render, records });
    const contentWithRefs = substituteFileRefs(content, renderedByRole);

    const instance: RenderedFileInstance = { role: node.role, loopValue: node.loopValue, path, content: contentWithRefs };
    results.push(instance);
    let list = renderedByRole.get(node.role);
    if (!list) { list = []; renderedByRole.set(node.role, list); }
    list.push(instance);
  }

  return results;
}
