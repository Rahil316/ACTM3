// Cross-file dependency graph (Part D) — a pre-generation static pass scans
// every file entry's templates for `{{files.<role>.*}}` references (a
// restricted, staticly-analyzable syntax form, deliberately NOT the general
// expression language — this needs to be scannable before any rendering
// happens at all) and builds a directed graph: file A -> file B for every
// reference from A to B. Topological sort determines generation order; a
// cycle is a semantic error, reported with the exact cycle path.

const FILE_REF_RE = /\{\{files\.([a-zA-Z0-9_-]+)\.(content|name|each)\}\}/g;

export interface FileRefUsage {
  role: string;
  form: "content" | "name" | "each";
}

// Scans a single template/path string for every {{files.<role>.*}} it
// contains — used both by graph construction and by Phase 4's semantic
// validation (checking role existence/perTheme-ness before generation).
export function scanFileRefs(text: string): FileRefUsage[] {
  const out: FileRefUsage[] = [];
  let m: RegExpExecArray | null;
  FILE_REF_RE.lastIndex = 0;
  while ((m = FILE_REF_RE.exec(text)) !== null) {
    out.push({ role: m[1], form: m[2] as "content" | "name" | "each" });
  }
  return out;
}

export class CycleError extends Error {
  constructor(public cyclePath: string[]) {
    super(`Cross-file reference cycle detected: ${cyclePath.join(" -> ")}`);
  }
}

// Node identity: a non-repeated entry is just its role; a repeatFor
// instance is "role[loopValue]" (e.g. "theme-file[light]") — Part D's
// "one graph node per resolved repetition instance."
export function nodeId(role: string, loopValue?: string): string {
  return loopValue !== undefined ? `${role}[${loopValue}]` : role;
}

export interface GraphInput {
  // One entry per REAL node that will be rendered (already expanded from
  // repeatFor — the orchestrator resolves "how many themes exist" against
  // the Dataset before building the graph, since repeatFor's instance count
  // is project data, not config-alone).
  id: string;
  role: string; // the role this node belongs to (same for every repeatFor instance of one entry)
  refs: FileRefUsage[]; // this node's own template/path scan result
  isPerTheme: boolean; // true if this node's role is a repeatFor entry (used to validate .each vs .content/.name — Phase 4)
}

// Topological sort (Kahn's algorithm). A referenced role may itself be
// perTheme (multiple instances) — a `.each` reference depends on ALL
// instances of that role; a `.content`/`.name` reference depends on the
// single (non-repeated) instance. Returns generation order; throws
// CycleError with the exact path if the graph has a cycle.
export function resolveGenerationOrder(nodes: GraphInput[]): string[] {
  const byRole = new Map<string, GraphInput[]>();
  for (const n of nodes) {
    let list = byRole.get(n.role);
    if (!list) { list = []; byRole.set(n.role, list); }
    list.push(n);
  }

  const edges = new Map<string, Set<string>>(); // node id -> ids it depends on
  for (const n of nodes) edges.set(n.id, new Set());
  for (const n of nodes) {
    for (const ref of n.refs) {
      const targets = byRole.get(ref.role) ?? [];
      for (const t of targets) edges.get(n.id)!.add(t.id);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const order: string[] = [];
  const stackPath: string[] = [];

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (inStack.has(id)) {
      const cycleStart = stackPath.indexOf(id);
      throw new CycleError([...stackPath.slice(cycleStart), id]);
    }
    inStack.add(id);
    stackPath.push(id);
    for (const dep of edges.get(id) ?? []) visit(dep);
    stackPath.pop();
    inStack.delete(id);
    visited.add(id);
    order.push(id);
  }

  for (const n of nodes) visit(n.id);
  return order;
}
