// Shared display metadata for sync-preview actions and structural-change kinds.
// Centralized here (rather than duplicated per-tab) so that adding a new
// SyncPreviewItem["action"] or StructuralChangeKind value is a compile error
// until every map below is updated — `satisfies Record<Union, …>` makes each
// map exhaustive over its union type.

import type { SyncPreviewItem } from "../../types/messages";
import type { StructuralChangeKind } from "../../types/messages";

type SyncAction = SyncPreviewItem["action"];

export const ACTION_VARIANT = {
  create: "success",
  update: "accent",
  rename: "warning",
  "rename+update": "warning",
  delete: "danger",
} satisfies Record<SyncAction, "success" | "accent" | "warning" | "danger">;

export const ACTION_LABEL = {
  create: "New",
  update: "Updated",
  rename: "Renamed",
  "rename+update": "Renamed",
  delete: "Removed",
} satisfies Record<SyncAction, string>;

export const COLLECTION_LABEL: Record<string, string> = {
  token: "Token",
  scale: "Scale",
  source: "Source",
};

export const STRUCTURAL_TITLE = {
  "mode-direct-to-scale": "Mode change: Direct → Scale",
  "mode-scale-to-direct": "Mode change: Scale → Direct",
  "scale-shrunk": "Scale length reduced",
  "scale-collection-renamed": "Scale collection renamed",
  "token-collection-renamed": "Token collection renamed",
  "source-collection-renamed": "Source collection renamed",
  "source-removed": "Source colors disabled",
  "alpha-removed": "Alpha tints disabled",
  "alpha-changed": "Alpha values changed",
  "scale-collection-removed": "Scale collection disabled",
} satisfies Record<StructuralChangeKind, string>;

export const ORPHANING_KINDS = new Set<StructuralChangeKind>(["alpha-removed", "alpha-changed", "scale-shrunk"]);

export type ChipVariant = "success" | "accent" | "warning" | "danger";

export const CHIP_BG: Record<ChipVariant, string> = {
  success: "bg-s-fi-subtle border-s-br-default hover:ring-1 hover:ring-s-br-default",
  accent: "bg-b-fi-subtle border-b-br-default hover:ring-1 hover:ring-b-br-default",
  warning: "bg-w-fi-subtle border-w-br-default hover:ring-1 hover:ring-w-br-default",
  danger: "bg-d-fi-subtle border-d-br-default hover:ring-1 hover:ring-d-br-default",
};
