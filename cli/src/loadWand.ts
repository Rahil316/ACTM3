// Reads a .wand file (a JSON-serialized ProjectStore, exported from the
// Token Wand Figma plugin) and returns it ready for translateConfig().
// A .wand file is just JSON.stringify(projectStore) — see
// src/shared/exportEng/bundler.ts's "wand" format arm.

import { readFileSync } from "fs";
import type { ProjectStore } from "../../src/ui/types/state";

export class WandFileError extends Error {}

export function loadWandFile(path: string): ProjectStore {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new WandFileError(`.wand file not found: ${path}`);
    throw new WandFileError(`Could not read .wand file at ${path}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new WandFileError(`.wand file at ${path} is not valid JSON.`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new WandFileError(`.wand file at ${path} does not contain a JSON object.`);
  }

  const store = parsed as Partial<ProjectStore>;
  if (!Array.isArray(store.colors) || !Array.isArray(store.roles)) {
    throw new WandFileError(`.wand file at ${path} is missing "colors" or "roles" — is this a real Token Wand project export?`);
  }

  return store as ProjectStore;
}
