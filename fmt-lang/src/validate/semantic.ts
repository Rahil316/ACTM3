// Cross-file reference validation (Part E, category 2) — role uniqueness,
// no forward/self-references, and .each vs .content/.name matching the
// referenced role's actual perTheme-ness. Runs on the document's files[]
// array alone, still with no Dataset (repeatFor's real instance COUNT is
// project data — see runtime.ts for the late-semantic cycle check that
// needs it — but role-level ordering/form-matching is knowable from config
// alone).
import { scanFileRefs } from "../xref/graph";
import { diagnostic, type Diagnostic } from "./diagnostics";

export interface FileEntryLike {
  role: string;
  repeatFor?: unknown;
  path: string;
  templateText: string; // the entry's own content-producing template, for scanning
}

export function validateFileEntries(entries: FileEntryLike[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  const seenRoles = new Map<string, boolean>(); // role -> isPerTheme

  entries.forEach((entry, i) => {
    if (seenRoles.has(entry.role)) {
      out.push(diagnostic("semantic", "error", "duplicate-role", `files[${i}].role "${entry.role}" duplicates an earlier entry's role — roles must be unique within a document.`, `files[${i}].role`));
      return;
    }

    const refs = [...scanFileRefs(entry.templateText), ...scanFileRefs(entry.path)];
    for (const ref of refs) {
      if (!seenRoles.has(ref.role)) {
        out.push(
          diagnostic(
            "semantic",
            "error",
            "forward-or-self-reference",
            `files[${i}] (role "${entry.role}") references {{files.${ref.role}.${ref.form}}}, but "${ref.role}" is not the role of any earlier entry — forward references and self-references aren't allowed.`,
            `files[${i}]`
          )
        );
        continue;
      }
      const referencedIsPerTheme = seenRoles.get(ref.role)!;
      if (ref.form === "each" && !referencedIsPerTheme) {
        out.push(
          diagnostic(
            "semantic",
            "error",
            "wrong-reference-form",
            `files[${i}] (role "${entry.role}") references {{files.${ref.role}.each}}, but "${ref.role}" is not a repeatFor entry (produces exactly one file) — use {{files.${ref.role}.content}}/{{files.${ref.role}.name}} instead.`,
            `files[${i}]`
          )
        );
      }
      if (ref.form !== "each" && referencedIsPerTheme) {
        out.push(
          diagnostic(
            "semantic",
            "error",
            "wrong-reference-form",
            `files[${i}] (role "${entry.role}") references {{files.${ref.role}.${ref.form}}}, but "${ref.role}" is a repeatFor entry (produces multiple files) — use {{files.${ref.role}.each}}...{{/files.${ref.role}.each}} instead.`,
            `files[${i}]`
          )
        );
      }
    }

    seenRoles.set(entry.role, entry.repeatFor !== undefined);
  });

  return out;
}
