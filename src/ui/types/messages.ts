import type { ProjectStore, UiPrefs } from "./state";
import type { ExportFile } from "../../shared/exportEng/types";
import type { NameConflict, SyncPreview, SyncPreviewItem } from "../../figma/variableTracker";
import type { StructuralChange } from "../../figma/config";
export type { ExportFile } from "../../shared/exportEng/types";
export type { NameConflict, SyncPreview, SyncPreviewItem } from "../../figma/variableTracker";
export type { StructuralChangeKind, StructuralChange } from "../../figma/config";

// ── Plugin → UI messages ─────────────────────────────────────────────────────

export interface LoadConfigMessage {
  type: "load-config";
  state: Partial<ProjectStore> | null;
  syncedState?: Partial<ProjectStore> | null;
}

export interface LoadUiPrefsMetaMessage {
  type: "load-ui-prefs-meta";
  prefs: Partial<UiPrefs>;
}

export interface CollectionCheckResultMessage {
  type: "collection-check-result";
  existing: ExistingCollection[];
  renames: RenameData;
  conflicts?: NameConflict[];
  syncPreview?: SyncPreview;
  structuralChanges?: StructuralChange[];
  items?: SyncPreviewItem[];
}

export interface FinishMessage {
  type: "finish";
  tally: SyncTally;
  errors: string[] | null;
  perCollection?: PerCollectionTally;
  durationMs?: number;
}

export interface PreviewDoneMessage {
  type: "preview-done";
}

export interface PreviewInterruptedMessage {
  type: "preview-interrupted";
}

export interface CapabilitiesMessage {
  type: "capabilities";
  capabilities: { multiMode: boolean };
}

export interface ProcessedDataResponseMessage {
  type: "processed-data-response";
  content: string;
  exportType: ExportFormat;
}

export interface ExportBundleResponseMessage {
  type: "export-bundle-response";
  files: ExportFile[];
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export interface WarningMessage {
  type: "warning";
  message: string;
}

export interface SelectionChangeMessage {
  type: "selection-change";
  isPreviewSelected: boolean;
}

export type PluginToUiMessage =
  | LoadConfigMessage
  | LoadUiPrefsMetaMessage
  | CollectionCheckResultMessage
  | FinishMessage
  | CapabilitiesMessage
  | ProcessedDataResponseMessage
  | ExportBundleResponseMessage
  | ErrorMessage
  | WarningMessage
  | SelectionChangeMessage
  | PreviewDoneMessage
  | PreviewInterruptedMessage;

// ── UI → Plugin messages ─────────────────────────────────────────────────────

export type SyncDecision = "keep" | "revert" | "hold-delete";

export interface RunCreatorMessage {
  type: "run-creator";
  state: ProjectStore;
  scope: SyncScope;
  savedState?: ProjectStore | null;
  decisions?: Record<string, SyncDecision>;
}

export interface CheckCollectionsMessage {
  type: "check-collections";
  state: ProjectStore;
  savedState?: ProjectStore | null;
}

export interface ResizeMessage {
  type: "resize";
  width: number;
  height: number;
}

export interface SaveUiPrefsMetaMessage {
  type: "save-ui-prefs-meta";
  prefs: UiPrefs;
}

export interface RequestProcessedDataMessage {
  type: "request-processed-data";
  exportType: ExportFormat;
  state: ProjectStore;
  timestamp: number;
}

export interface RequestExportBundleMessage {
  type: "request-export-bundle";
  formats: ExportFormat[];
  state: ProjectStore;
  timestamp: number;
}

export interface SaveConfigMessage {
  type: "save-config";
  state: ProjectStore;
}

export interface CancelMessage {
  type: "cancel";
}

export interface RunPreviewMessage {
  type: "run-preview";
  state: ProjectStore;
}

export interface UiReadyMessage {
  type: "ui-ready";
}

export type UiToPluginMessage = RunCreatorMessage | CheckCollectionsMessage | ResizeMessage | SaveUiPrefsMetaMessage | RequestProcessedDataMessage | RequestExportBundleMessage | SaveConfigMessage | CancelMessage | RunPreviewMessage | UiReadyMessage;

// ── Supporting types ─────────────────────────────────────────────────────────

export type SyncScope = "all" | "scale" | "roles";

export type ExportFormat = "json" | "css" | "csv" | "scss" | "tailwind" | "dtcg" | "style-dictionary" | "ios-swift" | "android" | "rn-ts" | "wand";

export interface SyncTally {
  created: number;
  updated: number;
  renamed: number;
  removed: number;
  failed: number;
}

export type SyncCollectionKind = "scale" | "token" | "source";

// created/updated/renamed only — removed/failed are cross-cutting (orphan
// purges and hard failures aren't attributed to one collection) and stay on
// the flat SyncTally instead.
export type PerCollectionTally = Partial<Record<SyncCollectionKind, Pick<SyncTally, "created" | "updated" | "renamed">>>;

export interface ExistingCollection {
  name: string;
  id: string;
}

export interface RenameData {
  scale: Record<string, string>;
  tokens: Record<string, string>;
  summary: {
    scaleCount: number;
    tokenCount: number;
    changes: Array<{ type: string; from: string; to: string }>;
  };
}

// ── postMessage helper ───────────────────────────────────────────────────────

export function sendToPlugin(msg: UiToPluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}
