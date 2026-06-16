import { useProjectStore } from "../../../store/projectStore";
import { useHealthReport } from "./health/useHealthReport";
import { MetricTileRow, type MetricKey } from "./health/HealthTab";
import { SettingsCard, SmallRow } from "../../../components/SettingsCard";
import { Callout } from "../../../components/Callout";
import { Badge } from "../../../components/Badge";
import { EmptyState } from "../../../components/EmptyState";
import { SectionLabel, HelperText, Mono, Caption, PageTitle } from "../../../components/typography";
import { IconCheck } from "../../../components/icons";
import type { SyncPreview, StructuralChange, ExistingCollection, SyncScope } from "../../../types/messages";
import type { RunDialogTab } from "../useRunDialogState";

const STRUCTURAL_TITLE: Record<string, string> = {
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
};

const ORPHANING_KINDS = new Set(["alpha-removed", "alpha-changed", "scale-shrunk"]);

interface SummaryTabProps {
  syncPreview: SyncPreview | null;
  structuralChanges: StructuralChange[];
  existingCollections: ExistingCollection[];
  conflicts: { tokenRef: string }[];
  multiMode: boolean;
  themes: { name: string }[];
  pluginMode: string;
  skipScales: boolean;
  scope: SyncScope;
  setScope: (v: SyncScope) => void;
  previewWasInterrupted: boolean;
  setPreviewWasInterrupted: (v: boolean) => void;
  setActiveTab: (tab: RunDialogTab) => void;
  setChangesFilter: (filter: "all" | "create" | "update" | "rename" | "delete") => void;
  setHealthMetric: (metric: MetricKey) => void;
  onOpenConflicts: () => void;
}

export function SummaryTab({
  syncPreview,
  structuralChanges,
  existingCollections,
  conflicts,
  multiMode,
  themes,
  pluginMode,
  skipScales,
  scope,
  onOpenConflicts,
  setScope,
  previewWasInterrupted,
  setPreviewWasInterrupted,
  setActiveTab,
  setChangesFilter,
  setHealthMetric,
}: SummaryTabProps) {
  const isChecking = syncPreview === null;
  const nothingToSync = syncPreview !== null && syncPreview.total === 0 && conflicts.length === 0;

  function goToChanges(filter: "all" | "create" | "update" | "rename" | "delete") {
    setChangesFilter(filter);
    setActiveTab("changes");
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── What will change ────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel className="text-n-tx-secondary px-0.5">What Will Change</SectionLabel>
        <SettingsCard className="!space-y-0">
          {isChecking ? (
            <div className="flex flex-col gap-2 py-1 animate-pulse">
              <div className="flex gap-1.5">
                <div className="h-[52px] flex-1 rounded-lg bg-n-sf-hover" />
                <div className="h-[52px] flex-1 rounded-lg bg-n-sf-hover" />
                <div className="h-[52px] flex-1 rounded-lg bg-n-sf-hover" />
                <div className="h-[52px] flex-1 rounded-lg bg-n-sf-hover" />
              </div>
              <div className="h-[10px] w-40 rounded bg-n-sf-hover" />
            </div>
          ) : nothingToSync ? (
            <EmptyState icon={<IconCheck className="w-5 h-5" />} title="Up to date" description="Figma variables already match the current configuration — nothing to sync." />
          ) : (
            <div className="flex flex-col gap-2 py-1">
              <div className="grid grid-cols-4 gap-1.5">
                <StatChip count={syncPreview!.toCreate} label="Create" variant="success" onClick={() => goToChanges("create")} />
                <StatChip count={syncPreview!.toUpdate} label="Update" variant="accent" onClick={() => goToChanges("update")} />
                <StatChip count={syncPreview!.toRename} label="Rename" variant="warning" onClick={() => goToChanges("rename")} />
                <StatChip count={syncPreview!.toDelete} label="Delete" variant="danger" onClick={() => goToChanges("delete")} />
              </div>
              <Caption className="text-n-tx-dim">
                {syncPreview!.total} variable change{syncPreview!.total !== 1 ? "s" : ""} across{" "}
                {existingCollections.length > 0
                  ? `${existingCollections.length} collection${existingCollections.length !== 1 ? "s" : ""}`
                  : "new collections"}.
                {" "}<button type="button" className="underline cursor-pointer hover:opacity-80" onClick={() => goToChanges("all")}>View all →</button>
              </Caption>
            </div>
          )}
        </SettingsCard>
      </div>

      {/* ── Health ──────────────────────────────────────────────────── */}
      <HealthSummary onViewHealth={(metric) => { setHealthMetric(metric); setActiveTab("health"); }} />

      {/* ── Sync scope ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel className="text-n-tx-secondary px-0.5">Sync Scope</SectionLabel>
        {skipScales ? (
          <Callout variant="info" title="Direct Sync Mode">
            Color variables are synced directly — no scale collection will be created.
          </Callout>
        ) : (
          <ScopeChecklist scope={scope} setScope={setScope} />
        )}
      </div>

      {/* ── Configuration ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel className="text-n-tx-secondary px-0.5">Configuration</SectionLabel>
        <SettingsCard className="!space-y-0 divide-y divide-n-br-hairline">
          <SmallRow
            label="Mode"
            control={<Badge variant="default" size="sm" className="capitalize">{pluginMode}</Badge>}
          />
          <SmallRow
            label="Collections"
            control={
              existingCollections.length > 0 ? (
                <div className="flex gap-1 flex-wrap justify-end">
                  {existingCollections.map((c) => (
                    <Badge key={c.id} variant="outline" size="xs">{c.name}</Badge>
                  ))}
                </div>
              ) : (
                <HelperText className="text-n-tx-dim text-right">Will be created</HelperText>
              )
            }
          />
          {themes.length > 0 && (
            <SmallRow
              label={`Theme${themes.length !== 1 ? "s" : ""}`}
              control={
                <div className="flex gap-1 flex-wrap justify-end">
                  {themes.map((t, i) => (
                    <Badge
                      key={t.name}
                      variant={multiMode ? "accent" : i === 0 ? "default" : "muted"}
                      size="xs"
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              }
            />
          )}
          <SmallRow
            label="Figma Plan"
            control={
              <Badge variant={multiMode ? "success" : "warning"} size="sm" dot>
                {multiMode ? "Multi-mode" : "Single-mode"}
              </Badge>
            }
          />
        </SettingsCard>
        {themes.length > 1 && !multiMode && (
          <HelperText className="text-n-tx-dim px-0.5">Only the first theme will be written — Figma Starter supports 1 mode per collection.</HelperText>
        )}
      </div>

      {/* ── Warnings ────────────────────────────────────────────────── */}

      {conflicts.length > 0 && (
        <Callout
          variant="warning"
          title={`${conflicts.length} name conflict${conflicts.length !== 1 ? "s" : ""} need review`}
          action={{ label: "Review →", onClick: onOpenConflicts }}
        />
      )}

      {structuralChanges.map((sc) => {
        const isOrphaning = !!sc.orphanedCollection || ORPHANING_KINDS.has(sc.kind);
        return (
          <Callout key={sc.kind} variant={isOrphaning ? "warning" : "info"} title={STRUCTURAL_TITLE[sc.kind] ?? sc.kind}>
            {sc.detail}
            {sc.orphanedCollection && <Mono className="block mt-1 opacity-70">{sc.orphanedCollection}</Mono>}
          </Callout>
        );
      })}

      {!multiMode && themes.length > 1 && (
        <Callout variant="warning" title="Only 1 theme will be applied">
          Your Figma plan supports only 1 mode per collection. Only <strong>{themes[0]?.name}</strong> will be written.
          {themes.slice(1).length > 0 && (
            <> Skipped: {themes.slice(1).map((t) => t.name).join(", ")}.</>
          )}{" "}
          Upgrade to a paid Figma plan to apply all themes.
        </Callout>
      )}

      {previewWasInterrupted && (
        <Callout variant="warning" title="Previous preview interrupted">
          The plugin was closed mid-render. Re-run preview to restore the canvas.{" "}
          <button type="button" className="underline cursor-pointer hover:opacity-80" onClick={() => setPreviewWasInterrupted(false)}>
            Dismiss
          </button>
        </Callout>
      )}
    </div>
  );
}

// ── Health summary ─────────────────────────────────────────────────────────────

function HealthSummary({ onViewHealth }: { onViewHealth: (metric: MetricKey) => void }) {
  const report = useHealthReport();
  const issueCount = report?.issueCount ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-0.5">
        <SectionLabel className="text-n-tx-secondary">Health</SectionLabel>
        <button type="button" onClick={() => onViewHealth("adjustments")} className="text-[11px] font-medium text-n-tx-dim hover:text-n-tx-primary underline-offset-2 hover:underline transition-colors cursor-pointer">
          View details →
        </button>
      </div>
      <SettingsCard className="!space-y-0 !p-2">
        <MetricTileRow selected="adjustments" onSelect={onViewHealth} onNavigateToHealth={undefined} />
        {issueCount !== null && (
          <Caption className={`text-right pt-1.5 ${issueCount === 0 ? "text-s-tx-muted" : issueCount < 5 ? "text-w-tx-muted" : "text-d-tx-muted"}`}>
            {issueCount === 0 ? "All tokens healthy" : `${issueCount} issue${issueCount !== 1 ? "s" : ""} detected`}
          </Caption>
        )}
      </SettingsCard>
    </div>
  );
}

// ── Scope checklist ────────────────────────────────────────────────────────────

function ScopeChecklist({ scope, setScope }: { scope: SyncScope; setScope: (v: SyncScope) => void }) {
  const setProjectField = useProjectStore((s) => s.setProjectField);
  const scaleCollectionName = useProjectStore((s) => s.projectStore.scaleCollectionName);
  const tokenCollectionName = useProjectStore((s) => s.projectStore.tokenCollectionName);
  const sourceCollectionName = useProjectStore((s) => s.projectStore.sourceCollectionName);
  const includeSourceColors = useProjectStore((s) => s.projectStore.includeSourceColors);

  const scaleOn = scope === "all" || scope === "scale";
  const rolesOn = scope === "all" || scope === "roles";

  function toggleScale() {
    if (scaleOn) setScope("roles");
    else setScope(rolesOn ? "all" : "scale");
  }

  function toggleRoles() {
    if (rolesOn) setScope("scale");
    else setScope(scaleOn ? "all" : "roles");
  }

  return (
    <SettingsCard className="!space-y-0 divide-y divide-n-br-hairline">
      <ScopeRow
        checked={scaleOn}
        onToggle={toggleScale}
        label="Scale"
        description="Primitive color collection"
        collectionName={scaleCollectionName}
        onNameChange={(v) => setProjectField("scaleCollectionName", v)}
      />
      <ScopeRow
        checked={rolesOn}
        onToggle={toggleRoles}
        label="Tokens"
        description="Semantic role collection"
        collectionName={tokenCollectionName}
        onNameChange={(v) => setProjectField("tokenCollectionName", v)}
      />
      <ScopeRow
        checked={includeSourceColors}
        onToggle={() => setProjectField("includeSourceColors", !includeSourceColors)}
        label="Source Colors"
        description="Raw hex reference collection"
        collectionName={sourceCollectionName}
        onNameChange={(v) => setProjectField("sourceCollectionName", v)}
        dimmed={!includeSourceColors}
      />
    </SettingsCard>
  );
}

interface ScopeRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  description: string;
  collectionName: string;
  onNameChange: (v: string) => void;
  dimmed?: boolean;
}

function ScopeRow({ checked, onToggle, label, description, collectionName, onNameChange, dimmed }: ScopeRowProps) {
  return (
    <div className={`flex items-center gap-2.5 py-2.5 transition-opacity ${dimmed ? "opacity-40" : ""}`}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={`shrink-0 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer ${
          checked
            ? "bg-b-fi-btn-default border-b-fi-btn-default"
            : "bg-transparent border-n-br-default hover:border-n-br-strong"
        }`}
      >
        {checked && <IconCheck className="w-2.5 h-2.5 text-white" />}
      </button>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <Caption className="font-medium text-n-tx-primary">{label}</Caption>
        <HelperText className="text-n-tx-dim">{description}</HelperText>
      </div>

      {/* Editable collection name */}
      <input
        type="text"
        value={collectionName}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={dimmed}
        className="w-[120px] shrink-0 h-6 px-2 text-[11px] font-mono text-n-tx-secondary bg-n-sf-input border border-n-br-default rounded-[6px] focus:outline-none focus:border-n-br-strong focus:bg-n-bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-right"
      />
    </div>
  );
}

type ChipVariant = "success" | "accent" | "warning" | "danger";

const CHIP_BG: Record<ChipVariant, string> = {
  success: "bg-s-fi-subtle border-s-br-default hover:ring-1 hover:ring-s-br-default",
  accent:  "bg-b-fi-subtle border-b-br-default hover:ring-1 hover:ring-b-br-default",
  warning: "bg-w-fi-subtle border-w-br-default hover:ring-1 hover:ring-w-br-default",
  danger:  "bg-d-fi-subtle border-d-br-default hover:ring-1 hover:ring-d-br-default",
};

// ── Stat chip ──────────────────────────────────────────────────────────────────

function StatChip({ count, label, variant, onClick }: { count: number; label: string; variant: ChipVariant; onClick: () => void }) {
  const isEmpty = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isEmpty}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border py-2 px-1 transition-all cursor-pointer disabled:cursor-default ${isEmpty ? "opacity-30" : ""} ${CHIP_BG[variant]}`}
    >
      <Caption>{label}</Caption>
      <PageTitle>{count}</PageTitle>
    </button>
  );
}
