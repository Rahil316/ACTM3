// Expands each document FileEntry's repeatFor against the real Dataset
// (repetition count/values are project data, not config-alone — see the
// plan's Part E on "late-semantic" checks), then builds and resolves the
// cross-file dependency graph (graph.ts) to get the final generation order.
import type { Dataset } from "../data/dataset";
import type { FileEntry } from "./fileEntry";
import { scanFileRefs, resolveGenerationOrder, nodeId, type GraphInput } from "./graph";

export interface ExpandedNode {
  id: string;
  role: string;
  entry: FileEntry;
  loopValue?: string; // e.g. a theme name, when entry.repeatFor is set
}

// One entry with repeatFor: "themes" becomes one node per Dataset.themeNames
// entry — "the repeated automatically once per dimension" mechanism (§2).
export function expandFileEntries(entries: FileEntry[], dataset: Dataset): ExpandedNode[] {
  const out: ExpandedNode[] = [];
  for (const entry of entries) {
    if (entry.repeatFor) {
      for (const themeName of dataset.themeNames) {
        out.push({ id: nodeId(entry.role, themeName), role: entry.role, entry, loopValue: themeName });
      }
    } else {
      out.push({ id: nodeId(entry.role), role: entry.role, entry });
    }
  }
  return out;
}

// A node's cross-file references can appear in its path OR anywhere in its
// rendering template (before/after content, which is where render.ts's
// substituteFileRefs actually looks for {{files.<role>.*}}) — scanning only
// `path` would miss the common case (an aggregator's {{files.*.each}} lives
// in `render.before`/`render.after`, never in its own output path). B.8's
// contentTemplate (the easy path) is its own separate text source — an
// aggregator built from `${tokens.*}` blocks can still reference other
// files by role via the same {{files.*}} syntax inside that template.
function scanEntryRefs(entry: FileEntry): ReturnType<typeof scanFileRefs> {
  const texts = [entry.path, entry.render?.before ?? "", entry.render?.after ?? "", entry.contentTemplate ?? ""];
  return texts.flatMap((t) => scanFileRefs(t));
}

// Builds the graph purely from each node's path+template scan, then
// resolves generation order. Doesn't render anything itself —
// exec/generate.ts (Phase 6) is the one that actually calls renderFile per
// node, in this order.
export function planGeneration(entries: FileEntry[], dataset: Dataset): { order: string[]; nodesById: Map<string, ExpandedNode> } {
  const expanded = expandFileEntries(entries, dataset);
  const nodesById = new Map(expanded.map((n) => [n.id, n]));

  const perThemeRoles = new Set(entries.filter((e) => e.repeatFor).map((e) => e.role));
  const graphInputs: GraphInput[] = expanded.map((n) => ({
    id: n.id,
    role: n.role,
    refs: scanEntryRefs(n.entry),
    isPerTheme: perThemeRoles.has(n.role),
  }));

  const order = resolveGenerationOrder(graphInputs);
  return { order, nodesById };
}
