import type { NameConflict } from "../types/messages";

// Single source of truth for whether a NameConflict may default to "keep"
// without an explicit user decision. "drift" (only Figma's name changed since
// baseline) is safe to default. "conflict" (the plugin's suggested name ALSO
// changed since baseline) must not get a silent default, or a deliberate
// in-plugin rename could be discarded unnoticed. Used by useSyncSession
// (initial decisions), ConflictList (per-row/bulk display), and RunDialog
// (nothingToSync messaging) — duplicating this check in each place is how a
// "conflict"-kind item could silently slip through with a stray "keep" default.
export function defaultNameConflictDecision(kind: NameConflict["kind"]): "keep" | null {
  return kind === "drift" ? "keep" : null;
}
