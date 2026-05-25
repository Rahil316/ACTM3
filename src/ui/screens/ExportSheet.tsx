import { useState, useCallback } from "react";
import {
  FileCode2,
  FileJson2,
  FileText,
  FileSpreadsheet,
  Smartphone,
  Tablet,
  Wind,
  Braces,
  Hash,
  Package,
  Download,
  Plus,
  X,
  PackageOpen,
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useUiStore } from "../store/uiStore";
import { useFigmaBridge, type BridgeCallbacks } from "../hooks/useFigmaBridge";
import { Sheet } from "../components/Sheet";
import { Backdrop } from "../components/Backdrop";
import { ModalHeader } from "../components/Modal";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";
import { toast } from "../store/toastStore";
import { sendToPlugin, type ExportFormat } from "../types/messages";
import { HelperText } from "../components/typography";
import type { LucideIcon } from "lucide-react";

// ── Format catalogue ──────────────────────────────────────────────────────────

interface FormatDef {
  format:      ExportFormat;
  label:       string;
  description: string;
  ext:         string;
  Icon:        LucideIcon;
}

const EXPORT_FORMATS: FormatDef[] = [
  {
    format:      "wand",
    label:       "Token Wand Config",
    description: "Full plugin config — reimportable",
    ext:         "wand",
    Icon:        Package,
  },
  {
    format:      "css",
    label:       "CSS Variables",
    description: "Per-theme custom properties + :root scale",
    ext:         "css",
    Icon:        Hash,
  },
  {
    format:      "scss",
    label:       "SCSS",
    description: "Scale vars, token maps, apply-theme mixin",
    ext:         "scss",
    Icon:        Hash,
  },
  {
    format:      "tailwind",
    label:       "Tailwind Config",
    description: "theme.extend.colors with CSS var references",
    ext:         "js",
    Icon:        Wind,
  },
  {
    format:      "dtcg",
    label:       "W3C Design Tokens (DTCG)",
    description: "W3C DTCG spec — works with Tokens Studio",
    ext:         "json",
    Icon:        Braces,
  },
  {
    format:      "style-dictionary",
    label:       "Style Dictionary",
    description: "SD v3 input format — transform to any platform",
    ext:         "json",
    Icon:        FileJson2,
  },
  {
    format:      "ios-swift",
    label:       "iOS / Swift",
    description: "UIColor + SwiftUI Color static extensions",
    ext:         "swift",
    Icon:        Tablet,
  },
  {
    format:      "android",
    label:       "Android XML",
    description: "values/ + values-night/ color resources",
    ext:         "xml",
    Icon:        Smartphone,
  },
  {
    format:      "rn-ts",
    label:       "React Native",
    description: "Typed token objects with useTokens() helper",
    ext:         "ts",
    Icon:        FileCode2,
  },
  {
    format:      "csv",
    label:       "CSV Spreadsheet",
    description: "Scale + role token table with contrast data",
    ext:         "csv",
    Icon:        FileSpreadsheet,
  },
  {
    format:      "json",
    label:       "JSON",
    description: "Design token JSON",
    ext:         "json",
    Icon:        FileText,
  },
];

// ── Download helper ───────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExportSheet() {
  const isOpen = useUiStore(
    (s) =>
      s.activeOverlay === "export-sheet" || s.activeOverlay === "design-lab",
  );
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const appState = useAppStore((s) => s.appState);

  // Queue = formats added for bulk export
  const [queue, setQueue] = useState<Set<ExportFormat>>(new Set());
  const [building, setBuilding] = useState(false);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  // ── Bridge callbacks ──────────────────────────────────────────────────────

  const handleProcessedData = useCallback(
    (format: string, content: string) => {
      setDownloading(null);
      if (!content) {
        toast.error("Export returned empty content.");
        return;
      }
      const fmt = EXPORT_FORMATS.find((f) => f.format === format);
      const projectName = (appState.name || "tokens")
        .replace(/\s+/g, "-")
        .toLowerCase();
      downloadBlob(content, `${projectName}.${fmt?.ext ?? "txt"}`);
      toast.success(`Downloaded ${fmt?.label ?? format}`);
    },
    [appState.name],
  );

  const handleExportBundle = useCallback(
    (files: Array<{ name: string; content: string }>) => {
      setBuilding(false);
      if (!files || files.length === 0) {
        toast.error("Export returned no files.");
        return;
      }
      files.forEach((f) => downloadBlob(f.content, f.name));
      toast.success(
        `Exported ${files.length} file${files.length > 1 ? "s" : ""}`,
      );
      setQueue(new Set());
    },
    [],
  );

  const handleError = useCallback((message: string) => {
    setBuilding(false);
    setDownloading(null);
    toast.error(message);
  }, []);

  useFigmaBridge({
    onProcessedData: handleProcessedData,
    onExportBundle:  handleExportBundle,
    onError:         handleError,
  } satisfies BridgeCallbacks);

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleSingleDownload(format: ExportFormat) {
    if (downloading) return;
    setDownloading(format);
    sendToPlugin({
      type:       "request-processed-data",
      exportType: format,
      state:      appState,
    });
  }

  function handleBulkExport() {
    if (queue.size === 0) return;
    setBuilding(true);
    sendToPlugin({
      type:    "request-export-bundle",
      formats: Array.from(queue),
      state:   appState,
    });
  }

  function toggleQueue(format: ExportFormat) {
    setQueue((prev) => {
      const next = new Set(prev);
      if (next.has(format)) next.delete(format);
      else next.add(format);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Backdrop open={isOpen} onClick={closeOverlay} />
      <Sheet open={isOpen}>
        <ModalHeader
          title="Export Tokens"
          subtitle="Download formats individually or queue for bulk export"
          actions={
            <Button
              variant="ghost"
              size="sm"
              label="Close"
              onClick={closeOverlay}
            />
          }
        />

        {/* Format list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          {EXPORT_FORMATS.map(({ format, label, description, Icon }) => {
            const inQueue = queue.has(format);
            const isLoading = downloading === format;

            return (
              <div
                key={format}
                className={[
                  "flex items-center gap-3 px-3 py-2 rounded-[10px] border transition-colors",
                  inQueue
                    ? "border-accent bg-accent-subtle"
                    : "border-border-base bg-bg-card",
                ].join(" ")}
              >
                {/* Format icon */}
                <Icon
                  size={16}
                  className={
                    inQueue
                      ? "text-accent shrink-0"
                      : "text-text-muted shrink-0"
                  }
                  strokeWidth={1.75}
                />

                {/* Label + desc */}
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      "text-[12px] font-semibold",
                      inQueue ? "text-accent" : "text-text-primary",
                    ].join(" ")}
                  >
                    {label}
                  </p>
                  <HelperText>{description}</HelperText>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* + / ✕ queue toggle */}
                  <button
                    type="button"
                    onClick={() => toggleQueue(format)}
                    title={
                      inQueue ? "Remove from bulk export" : "Add to bulk export"
                    }
                    className={[
                      "w-6 h-6 rounded-[6px] flex items-center justify-center transition-colors cursor-pointer",
                      inQueue
                        ? "bg-accent text-white hover:opacity-80"
                        : "bg-bg-input border border-border-base text-text-muted hover:bg-bg-hover hover:text-text-primary",
                    ].join(" ")}
                  >
                    {inQueue ? (
                      <X size={11} strokeWidth={2.5} />
                    ) : (
                      <Plus size={11} strokeWidth={2.5} />
                    )}
                  </button>

                  {/* Download button */}
                  <button
                    type="button"
                    onClick={() => handleSingleDownload(format)}
                    disabled={!!downloading}
                    title={`Download ${label}`}
                    className="h-6 px-2 rounded-[6px] flex items-center gap-1 text-[10px] font-semibold bg-bg-input border border-border-base text-text-primary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  >
                    {isLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <Download size={11} strokeWidth={2} />
                    )}
                    <span className="hidden sm:inline">
                      {isLoading ? "…" : ""}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bulk export footer — always visible, disabled when queue empty */}
        <div className="shrink-0 px-3 py-3 border-t border-border-base">
          {building ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <Spinner size="sm" />
              <span className="text-[12px] text-text-muted">
                Building package…
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <PackageOpen
                  size={13}
                  strokeWidth={1.75}
                  className={queue.size > 0 ? "text-accent" : "text-text-dim"}
                />
                <span
                  className={[
                    "text-[11px]",
                    queue.size > 0 ? "text-text-muted" : "text-text-dim",
                  ].join(" ")}
                >
                  {queue.size > 0
                    ? `${queue.size} format${queue.size > 1 ? "s" : ""} queued`
                    : "No formats queued"}
                </span>
                {queue.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setQueue(new Set())}
                    className="text-[10px] text-text-dim hover:text-danger cursor-pointer ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Button
                variant="primary"
                size="md"
                label="Export All"
                leftIcon={<Package size={13} strokeWidth={2} />}
                onClick={handleBulkExport}
                disabled={queue.size === 0}
              />
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
