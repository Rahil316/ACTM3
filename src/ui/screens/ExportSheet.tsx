import { useState, useCallback, useRef } from "react";
import { LucideFileCode as FileCode2, LucideFileJson as FileJson2, LucideFile as FileText, LucideFileSpreadsheet as FileSpreadsheet, LucideSmartphone as Smartphone, LucideTablet as Tablet, LucideWind as Wind, LucideBraces as Braces, LucideHash as Hash, LucidePackage as Package, LucideExport as Download, LucidePlus as Plus, LucideClose as X, LucidePackageOpen as PackageOpen } from "../components/icons";
import { useProjectStore } from "../store/projectStore";
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
import { _slug, _projectSlug, _exportTimestamp } from "../utils/exportNaming";
import type { LucideIcon } from "lucide-react";

// ── Format catalogue ──────────────────────────────────────────────────────────

interface FormatDef {
  format: ExportFormat;
  label: string;
  description: string;
  ext: string;
  Icon: LucideIcon;
}

const EXPORT_FORMATS: FormatDef[] = [
  {
    format: "wand",
    label: "Token Wand Config",
    description: "Full plugin config — reimportable",
    ext: "wand",
    Icon: Package,
  },
  {
    format: "css",
    label: "CSS Variables",
    description: "Per-theme custom properties + :root scale",
    ext: "css",
    Icon: Hash,
  },
  {
    format: "scss",
    label: "SCSS",
    description: "Scale vars, token maps, apply-theme mixin",
    ext: "scss",
    Icon: Hash,
  },
  {
    format: "tailwind",
    label: "Tailwind Config",
    description: "theme.extend.colors with CSS var references",
    ext: "js",
    Icon: Wind,
  },
  {
    format: "dtcg",
    label: "W3C Design Tokens (DTCG)",
    description: "W3C DTCG spec — works with Tokens Studio",
    ext: "json",
    Icon: Braces,
  },
  {
    format: "style-dictionary",
    label: "Style Dictionary",
    description: "SD v3 input format — transform to any platform",
    ext: "json",
    Icon: FileJson2,
  },
  {
    format: "ios-swift",
    label: "iOS / Swift",
    description: "UIColor + SwiftUI Color static extensions",
    ext: "swift",
    Icon: Tablet,
  },
  {
    format: "android",
    label: "Android XML",
    description: "values/ + values-night/ color resources",
    ext: "xml",
    Icon: Smartphone,
  },
  {
    format: "rn-ts",
    label: "React Native",
    description: "Typed token objects with useTokens() helper",
    ext: "ts",
    Icon: FileCode2,
  },
  {
    format: "csv",
    label: "CSV Spreadsheet",
    description: "Scale + role token table with contrast data",
    ext: "csv",
    Icon: FileSpreadsheet,
  },
  {
    format: "json",
    label: "JSON",
    description: "Design token JSON",
    ext: "json",
    Icon: FileText,
  },
];

// ── Naming helpers ────────────────────────────────────────────────────────────

const MAX_NAMED_FORMATS = 3;
const FORMAT_ORDER: ExportFormat[] = EXPORT_FORMATS.map((f) => f.format);

// Builds the tech-name segment of an export filename: up to MAX_NAMED_FORMATS
// format names (in catalogue order), then a "N-others" suffix for the rest.
function techListSlug(formats: ExportFormat[]): string {
  const ordered = FORMAT_ORDER.filter((f) => formats.includes(f));
  const named = ordered.slice(0, MAX_NAMED_FORMATS);
  const remaining = ordered.length - named.length;
  const parts = named.map((f) => _slug(f));
  if (remaining > 0) parts.push(`${remaining}-others`);
  return parts.join("-");
}

// ── Download helpers ──────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadFiles(files: Array<{ path: string; content: string }>, zipName: string, formatCount: number) {
  if (formatCount === 1 && files.length === 1) {
    // Exactly one format requested, and it produced exactly one file — direct download.
    const f = files[0];
    const filename = f.path.split("/").pop() ?? f.path;
    downloadBlob(f.content, filename);
  } else {
    // Multiple formats requested, or a single format that expanded into several files — zip them.
    let JSZipModule;
    try {
      JSZipModule = await import("jszip");
    } catch {
      toast.error("Failed to load export library");
      return;
    }
    const JSZip = JSZipModule.default;
    const zip = new JSZip();
    for (const f of files) {
      zip.file(f.path, f.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipName + ".zip";
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExportSheet() {
  const isOpen = useUiStore((s) => s.activeOverlay === "export-sheet" || s.activeOverlay === "design-lab");
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const projectStore = useProjectStore((s) => s.projectStore);

  // Queue = formats added for bulk export
  const [queue, setQueue] = useState<Set<ExportFormat>>(new Set());
  const [building, setBuilding] = useState(false);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  // Holds the filename + requested format count decided at request time so the response handler can use them
  const pendingZipName = useRef<string>("");
  const pendingFormatCount = useRef<number>(1);

  // ── Bridge callbacks ──────────────────────────────────────────────────────

  const handleExportBundle = useCallback(
    (files: Array<{ path: string; content: string }>) => {
      const wasBulk = building;
      setBuilding(false);
      setDownloading(null);
      if (!files || files.length === 0) {
        toast.error("Export returned no files.");
        return;
      }
      downloadFiles(files, pendingZipName.current, pendingFormatCount.current).then(() => {
        const label = wasBulk ? `Exported ${files.length} file${files.length > 1 ? "s" : ""}` : `Downloaded ${files.length > 1 ? files.length + " files" : files[0].path.split("/").pop()}`;
        toast.success(label);
        if (wasBulk) setQueue(new Set());
      });
    },
    [building],
  );

  const handleError = useCallback((message: string) => {
    setBuilding(false);
    setDownloading(null);
    toast.error(message);
  }, []);

  useFigmaBridge({
    onExportBundle: handleExportBundle,
    onError: handleError,
  } satisfies BridgeCallbacks);

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleSingleDownload(format: ExportFormat) {
    if (downloading) return;
    const ts = Date.now();
    const projectSlug = _projectSlug(projectStore.name);
    pendingZipName.current = `${projectSlug}_${_slug(format)}_${_exportTimestamp(ts)}`;
    pendingFormatCount.current = 1;
    setDownloading(format);
    sendToPlugin({ type: "request-processed-data", exportType: format, state: projectStore, timestamp: ts });
  }

  function handleBulkExport() {
    if (queue.size === 0) return;
    const ts = Date.now();
    const projectSlug = _projectSlug(projectStore.name);
    const formats = Array.from(queue);
    pendingZipName.current = `${projectSlug}_${techListSlug(formats)}_${_exportTimestamp(ts)}`;
    pendingFormatCount.current = formats.length;
    setBuilding(true);
    sendToPlugin({
      type: "request-export-bundle",
      formats,
      state: projectStore,
      timestamp: ts,
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

  const hasColors = (projectStore.colors ?? []).length > 0;
  const hasRoles = (projectStore.roles ?? []).length > 0;
  const isEmpty = !hasColors || !hasRoles;

  return (
    <>
      <Backdrop open={isOpen} onClick={closeOverlay} />
      <Sheet open={isOpen}>
        <ModalHeader title="Export Tokens" subtitle="Download formats individually or queue for bulk export" actions={<Button variant="ghost" size="sm" label="Close" onClick={closeOverlay} />} />

        {isEmpty && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-[8px] bg-w-fi-subtle border border-w-br-default text-[11px] text-n-tx-muted leading-relaxed">
            {!hasColors && !hasRoles
              ? "Add colors and roles before exporting."
              : !hasColors
              ? "Add at least one color before exporting."
              : "Add at least one role before exporting."}
          </div>
        )}

        {/* Format list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          {EXPORT_FORMATS.map(({ format, label, description, Icon }) => {
            const inQueue = queue.has(format);
            const isLoading = downloading === format;

            return (
              <div key={format} className={["flex items-center gap-3 px-3 py-2 rounded-[10px] border transition-colors", inQueue ? "border-b-br-default bg-b-fi-subtle" : "border-n-br-default bg-n-sf-raised"].join(" ")}>
                {/* Format icon */}
                <Icon size={16} className={inQueue ? "text-b-tx-muted shrink-0" : "text-n-tx-muted shrink-0"} strokeWidth={1.75} />

                {/* Label + desc */}
                <div className="flex-1 min-w-0">
                  <p className={["text-[12px] font-semibold", inQueue ? "text-b-tx-muted" : "text-n-tx-primary"].join(" ")}>{label}</p>
                  <HelperText>{description}</HelperText>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* + / ✕ queue toggle */}
                  <Button
                    variant={inQueue ? "primary" : "secondary"}
                    size="sm"
                    square
                    icon={inQueue ? <X size={11} strokeWidth={2.5} /> : <Plus size={11} strokeWidth={2.5} />}
                    onClick={() => toggleQueue(format)}
                    disabled={isEmpty}
                    title={inQueue ? "Remove from bulk export" : "Add to bulk export"}
                  />

                  {/* Download button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Download size={11} strokeWidth={2} />}
                    loading={isLoading}
                    onClick={() => handleSingleDownload(format)}
                    disabled={downloading !== null || isEmpty}
                    title={`Download ${label}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bulk export footer — always visible, disabled when queue empty */}
        <div className="shrink-0 px-3 py-3 border-t border-n-br-default">
          {building ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <Spinner size="sm" />
              <span className="text-[12px] text-n-tx-muted">Building package…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <PackageOpen size={13} strokeWidth={1.75} className={queue.size > 0 ? "text-b-tx-muted" : "text-n-tx-dim"} />
                <span className={["text-[11px]", queue.size > 0 ? "text-n-tx-muted" : "text-n-tx-dim"].join(" ")}>{queue.size > 0 ? `${queue.size} format${queue.size > 1 ? "s" : ""} queued` : "No formats queued"}</span>
                {queue.size > 0 && <Button variant="underlined" size="xs" label="Clear" onClick={() => setQueue(new Set())} className="ml-1" />}
              </div>
              <Button variant="primary" size="md" label="Export All" leftIcon={<Package size={13} strokeWidth={2} />} onClick={handleBulkExport} disabled={queue.size === 0 || isEmpty} />
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
