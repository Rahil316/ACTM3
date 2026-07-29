// Runtime/data validation (Part E, category 3) — checks that can only be
// resolved against the REAL Dataset, not from configuration alone. Tagged
// "runtime", never conflated with semantic errors, per §5's explicit
// requirement.
import type { Dataset } from "../data/dataset";
import { diagnostic, type Diagnostic } from "./diagnostics";
import { CycleError } from "../xref/graph";
import { planGeneration } from "../xref/resolveOrder";
import type { FileEntry } from "../xref/fileEntry";

// B.3a guardrail #2: a naming scheme that causes two DISTINCT project
// colors to collide on the same rendered name — a project-data fact (which
// colors exist), not knowable from the naming config alone.
export function checkNamingCollisions(names: { rawName: string; rendered: string }[], namingDefName: string): Diagnostic[] {
  const byRendered = new Map<string, Set<string>>();
  for (const n of names) {
    let set = byRendered.get(n.rendered);
    if (!set) { set = new Set(); byRendered.set(n.rendered, set); }
    set.add(n.rawName);
  }
  const out: Diagnostic[] = [];
  for (const [rendered, raws] of byRendered) {
    if (raws.size > 1) {
      const rawList = [...raws].map((r) => `"${r}"`).join(", ");
      out.push(
        diagnostic(
          "runtime",
          "warning",
          "naming-collision",
          `${raws.size} distinct colors (${rawList}) both produced the name "${rendered}" under the naming scheme "${namingDefName}" — one will silently overwrite the other in any output that keys by name. Consider a naming override for one of them.`
        )
      );
    }
  }
  return out;
}

// B.8's "referencing a shape that doesn't exist in this project" — a
// structural absence (Direct mode has no scale collection at all) is an
// error; an EMPTY collection (Scale mode, zero steps) is legitimate empty
// output, not an error. Only checkable against the real Dataset.
export function checkShapeExists(dataset: Dataset, shape: "scaleStep", blockName: string): Diagnostic[] {
  if (shape === "scaleStep" && !dataset.hasScaleCollection) {
    return [
      diagnostic(
        "runtime",
        "error",
        "missing-shape",
        `"${blockName}" was referenced, but this project has no scale collection (it's using Direct mode, not Scale mode). Remove this reference, or point this target at a Scale-mode project.`
      ),
    ];
  }
  return [];
}

// A `getEntriesBy*`/select `where` argument that matches no real project
// identity — a project-data fact.
export function checkIdentityExists(query: string, matched: boolean, kind: string): Diagnostic[] {
  if (matched) return [];
  return [
    diagnostic("runtime", "error", "unknown-identity", `"${query}" does not match any ${kind} in this project's data.`),
  ];
}

// Late-semantic cycle detection (Part E: needs repeatFor's real instance
// count, which is project data) — runs here, strictly before any file
// content is rendered.
export function checkCycles(entries: FileEntry[], dataset: Dataset): Diagnostic[] {
  try {
    planGeneration(entries, dataset);
    return [];
  } catch (err) {
    if (err instanceof CycleError) {
      return [diagnostic("semantic", "error", "reference-cycle", err.message)];
    }
    throw err;
  }
}
