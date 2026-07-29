// The only fs-touching module in fmt-lang (Part F) — mirrors
// cli/src/build.ts's already-correct, existing write policy exactly (read
// directly from its source rather than re-deriving): created/updated/
// unchanged classification computed by comparing against what's already on
// disk (even under dry-run, so the preview is accurate); a byte-identical
// file is "unchanged" and never rewritten.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import type { GeneratedFile } from "./generate";

export type FileWriteStatus = "created" | "updated" | "unchanged";

export interface WriteResultEntry {
  path: string; // full path, outDir-joined
  status: FileWriteStatus;
  diff?: { before: string | null; after: string };
}

export interface WriteOptions {
  outDir: string;
  dryRun?: boolean;
  diff?: boolean; // opt-in: also return old/new content pairs for visibility before a destructive change
}

export function write(files: GeneratedFile[], options: WriteOptions): WriteResultEntry[] {
  const results: WriteResultEntry[] = [];

  for (const file of files) {
    const fullPath = join(options.outDir, file.path);
    let status: FileWriteStatus;
    let before: string | null = null;

    if (!existsSync(fullPath)) {
      status = "created";
    } else {
      before = readFileSync(fullPath, "utf-8");
      status = before === file.content ? "unchanged" : "updated";
    }

    if (!options.dryRun && status !== "unchanged") {
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, file.content, "utf-8");
    }

    const entry: WriteResultEntry = { path: fullPath, status };
    if (options.diff) entry.diff = { before, after: file.content };
    results.push(entry);
  }

  return results;
}
