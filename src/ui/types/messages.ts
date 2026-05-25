import type { AppState, UiPrefs } from './state';

// ── Plugin → UI messages ─────────────────────────────────────────────────────

export interface LoadConfigMessage {
  type: 'load-config';
  state: Partial<AppState> | null;
}

export interface LoadUiPrefsMetaMessage {
  type: 'load-ui-prefs-meta';
  prefs: Partial<UiPrefs>;
}

export interface CollectionCheckResultMessage {
  type: 'collection-check-result';
  existing: ExistingCollection[];
  renames: RenameData;
}

export interface FinishMessage {
  type: 'finish';
  tally: SyncTally;
  errors: string[] | null;
  result: unknown | null;
}

export interface CapabilitiesMessage {
  type: 'capabilities';
  capabilities: { multiMode: boolean };
}

export interface ProcessedDataResponseMessage {
  type: 'processed-data-response';
  content: string;
  exportType: ExportFormat;
}

export interface ExportBundleResponseMessage {
  type: 'export-bundle-response';
  files: ExportFile[];
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface WarningMessage {
  type: 'warning';
  message: string;
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
  | WarningMessage;

// ── UI → Plugin messages ─────────────────────────────────────────────────────

export interface RunCreatorMessage {
  type: 'run-creator';
  state: AppState;
  scope: SyncScope;
  savedState?: AppState | null;
}

export interface CheckCollectionsMessage {
  type: 'check-collections';
  state: AppState;
  savedState?: AppState | null;
}

export interface ResizeMessage {
  type: 'resize';
  width: number;
  height: number;
}

export interface SaveUiPrefsMetaMessage {
  type: 'save-ui-prefs-meta';
  prefs: UiPrefs;
}

export interface RequestProcessedDataMessage {
  type: 'request-processed-data';
  exportType: ExportFormat;
  state: AppState;
}

export interface RequestExportBundleMessage {
  type: 'request-export-bundle';
  formats: ExportFormat[];
  state: AppState;
}

export interface SaveConfigMessage {
  type: 'save-config';
  state: AppState;
}

export interface CancelMessage {
  type: 'cancel';
}

export type UiToPluginMessage =
  | RunCreatorMessage
  | CheckCollectionsMessage
  | ResizeMessage
  | SaveUiPrefsMetaMessage
  | RequestProcessedDataMessage
  | RequestExportBundleMessage
  | SaveConfigMessage
  | CancelMessage;

// ── Supporting types ─────────────────────────────────────────────────────────

export type SyncScope = 'all' | 'groups' | 'roles';

export type ExportFormat =
  | 'json'
  | 'css'
  | 'csv'
  | 'scss'
  | 'tailwind'
  | 'dtcg'
  | 'style-dictionary'
  | 'ios-swift'
  | 'android'
  | 'rn-ts'
  | 'wand';

export interface SyncTally {
  created: number;
  updated: number;
  renamed: number;
  failed: number;
}

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

export interface ExportFile {
  path: string;
  content: string;
}

// ── postMessage helper ───────────────────────────────────────────────────────

export function sendToPlugin(msg: UiToPluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}
