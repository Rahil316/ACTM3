import { useCallback, useRef, useState } from "react";
import logoSvg from "./assets/logo.svg";
import clsx from "clsx";
import { useFigmaBridge } from "./hooks/useFigmaBridge";
import { useLocalField } from "./hooks/useLocalField";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useUiPrefs } from "./hooks/useUiPrefs";
import { useUiStore } from "./store/uiStore";
import { useProjectStore, makeBootstrapState, ensureIds, ensureVariations, UI_DIMS } from "./store/projectStore";
import { toast } from "./store/toastStore";
import { BannerSlot } from "./components/Banner";
import { ToastHub } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Button } from "./components/Button";
import { Eye, Play, Download, Settings, RotateCcw, Upload, Bookmark, ShoppingBag } from "lucide-react";
import { ColorsScreen } from "./screens/ColorsScreen";
import { RolesScreen } from "./screens/RolesScreen";
import { SettingsOverlay } from "./screens/SettingsOverlay";
import { PreviewScreen } from "./screens/PreviewScreen";
import { RunDialog } from "./screens/RunDialog";
import { ProjectScreen } from "./screens/ProjectScreen";
import { SaveVersionOverlay } from "./screens/SaveVersionOverlay";
import { QuickStart } from "./screens/QuickStart";
import { ThemeShopOverlay } from "./screens/ThemeShopOverlay";
import { CanvasPreviewDevOverlay } from "./screens/CanvasPreviewDevOverlay";
 
declare const __RELEASE__: boolean;
import { ExportSheet } from "./screens/ExportSheet";
import { sendToPlugin } from "./types/messages";
import type { ProjectStore, SidebarTab } from "./types/state";

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { value: SidebarTab; label: string }[] = [
  { value: "color-groups", label: "Colors" },
  { value: "roles", label: "Roles" },
  { value: "project", label: "Project" },
];

// ── Resize handle ─────────────────────────────────────────────────────────────

function ResizeHandle() {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = window.innerWidth;
    const startH = window.innerHeight;

    function onMove(ev: MouseEvent) {
      const w = Math.max(UI_DIMS.minWidth, Math.min(UI_DIMS.maxWidth, startW + ev.clientX - startX));
      const h = Math.max(UI_DIMS.minHeight, Math.min(UI_DIMS.maxHeight, startH + ev.clientY - startY));
      sendToPlugin({ type: "resize", width: Math.round(w), height: Math.round(h) });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div onMouseDown={handleMouseDown} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 opacity-30 hover:opacity-70 transition-opacity" style={{ touchAction: "none" }} title="Drag to resize">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-text-muted">
        <path d="M14 10l-4 4h4v-4zm0-6l-10 10h2l8-8V4zM8 14l6-6v2l-4 4H8z" />
      </svg>
    </div>
  );
}

// ── Project name inline editor ────────────────────────────────────────────────

function ProjectNameInput({ projectStore }: { projectStore: ProjectStore }) {
  const updateProjectName = useProjectStore((s) => s.updateProjectName);
  const [localName, onNameChange, onNameBlur] = useLocalField(projectStore.name, updateProjectName);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <img src={logoSvg} alt="Token Wand" className="h-[18px] w-auto shrink-0" />
      <input
        type="text"
        value={localName}
        onChange={onNameChange}
        onBlur={onNameBlur}
        aria-label="Project name"
        className="text-[13px] font-semibold text-text-primary bg-transparent border border-transparent outline-none min-w-0 w-full max-w-[160px] truncate hover:bg-bg-hover focus:bg-bg-input focus:border-border-focus rounded-[4px] px-1 -mx-1 py-0.5 transition-colors cursor-text"
        title="Click to rename project"
      />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  useFigmaBridge();
  useUiPrefs();

  const activeTab = useUiStore((s) => s.activeSidebarTab);
  const setActiveTab = useUiStore((s) => s.setActiveSidebarTab);
  const openOverlay = useUiStore((s) => s.openOverlay);
  const activeOverlay = useUiStore((s) => s.activeOverlay);

  const loadState = useProjectStore((s) => s.loadState);
  const saveBlockedReason = useProjectStore((s) => s.versionSaveBlockedReason());
  const projectStore = useProjectStore((s) => s.projectStore);

  const importRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as ProjectStore;
        if (!Array.isArray(parsed.colors) || !Array.isArray(parsed.roles) || !Array.isArray(parsed.themes)) {
          toast.error("Invalid file: missing colors, roles, or themes");
          return;
        }
        ensureIds(parsed);
        ensureVariations(parsed);
        loadState(parsed);
        toast.success("Configuration imported");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    const blank = makeBootstrapState();
    blank.colors = [];
    blank.roles = [];
    blank.themes = [{ _id: blank.themes[0]._id, name: "Light", bg: "#FFFFFF" }];
    loadState(blank);
    openOverlay("quick-start");
  }

  useKeyboardShortcuts(importRef);

  return (
    <div className="relative flex flex-col h-full bg-bg-app text-text-primary font-sans text-xs overflow-hidden">
      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".json,.wand" className="hidden" onChange={handleImportFile} />

      {/* Dialogs */}
      <ConfirmDialog
        open={confirmReset}
        title="Reset everything?"
        body="This will remove all colors, roles, themes and versions. The plugin will start completely empty."
        confirmLabel="Reset"
        confirmVariant="danger-solid"
        onConfirm={() => {
          setConfirmReset(false);
          handleReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />

      {/* Overlays — conditionally mounted so closed overlays don't subscribe to the store */}
      {activeOverlay === "theme-shop" && <ThemeShopOverlay />}
      {activeOverlay === "settings" && <SettingsOverlay />}
      {activeOverlay === "preview" && <PreviewScreen />}
      {activeOverlay === "run-dialog" && <RunDialog />}
      {(activeOverlay === "export-sheet" || activeOverlay === "design-lab") && <ExportSheet />}
      {activeOverlay === "save-version" && <SaveVersionOverlay />}
      {activeOverlay === "quick-start" && <QuickStart onClose={() => {}} />}
      {!__RELEASE__ && activeOverlay === "canvas-preview-dev" && <CanvasPreviewDevOverlay />}

      {/* ── Header ── */}
      <header className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-border-base bg-bg-app sticky top-0 z-10">
        <ProjectNameInput projectStore={projectStore} />

        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="md" leftIcon={<Eye size={13} strokeWidth={2} />} label="Preview" onClick={() => openOverlay("preview")} title="Preview  (Alt+P)" />
          <Button variant="secondary" size="md" leftIcon={<Download size={13} strokeWidth={2} />} label="Export" onClick={() => openOverlay("export-sheet")} title="Export tokens" />
          <Button variant="primary" size="md" leftIcon={<Play size={13} strokeWidth={2} />} label="Run" onClick={() => openOverlay("run-dialog")} title="Publish to Figma  (Alt+Enter)" />
        </div>
      </header>

      {/* Banner slot */}
      <BannerSlot />

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-border-base overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={clsx(
              "shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap transition-all duration-150",
              activeTab === tab.value ? "bg-accent border-accent text-text-on-accent" : "border-border-base bg-transparent text-text-muted hover:bg-bg-hover hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}

        <div className="flex items-center gap-0.5 ml-auto">
          <Button variant="ghost" size="sm" square icon={<ShoppingBag size={14} strokeWidth={1.75} />} onClick={() => openOverlay("theme-shop")} title="Theme Shop" aria-label="Theme Shop" />
          <Button variant="ghost" size="sm" square icon={<RotateCcw size={14} strokeWidth={1.75} />} onClick={() => setConfirmReset(true)} title="Reset all (clears everything)" aria-label="Reset all" />
          <Button
            variant="ghost"
            size="sm"
            square
            icon={<Upload size={14} strokeWidth={1.75} />}
            onClick={() => {
              if (importRef.current) {
                importRef.current.value = "";
                importRef.current.click();
              }
            }}
            title="Import .wand / JSON  (Alt+I)"
            aria-label="Import .wand / JSON"
          />
          <Button
            variant="ghost"
            size="sm"
            square
            icon={<Bookmark size={14} strokeWidth={1.75} />}
            onClick={() => !saveBlockedReason && openOverlay("save-version")}
            title={saveBlockedReason ?? "Save state  (Alt+S)"}
            aria-label="Save state"
            disabled={!!saveBlockedReason}
          />
          <Button variant="ghost" size="sm" square icon={<Settings size={14} strokeWidth={1.75} />} onClick={() => openOverlay("settings")} title="Settings  (Alt+K)" aria-label="Settings" />
        </div>
      </div>

      {/* ── Screen content ── */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "color-groups" && <ColorsScreen />}
        {activeTab === "roles" && <RolesScreen />}
        {activeTab === "project" && <ProjectScreen />}
      </main>

      <ToastHub />
      <ResizeHandle />
    </div>
  );
}
