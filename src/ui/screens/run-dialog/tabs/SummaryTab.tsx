import { useState, useEffect } from "react";
import { useProjectStore } from "../../../store/projectStore";
import { useHealthReport } from "./health/useHealthReport";
import { MetricTileRow, type MetricKey } from "./health/HealthTab";
import { SettingsCard, SmallRow, CollectionRow } from "../../../components/SettingsCard";
import { Callout } from "../../../components/Callout";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { EmptyState } from "../../../components/EmptyState";
import { SectionLabel, HelperText, Mono, Caption, PageTitle, MicroText } from "../../../components/typography";
import { IconCheck, IconLayers, IconReset } from "../../../components/icons";
import { Input } from "../../../components/Input";
import type { SyncPreview, StructuralChange, ExistingCollection, SyncScope, SyncDecision } from "../../../types/messages";
import type { RunDialogTab } from "../useRunDialogState";
import { STRUCTURAL_TITLE, ORPHANING_KINDS, CHIP_BG, type ChipVariant } from "../changeDisplay";
import { defaultNameConflictDecision } from "../../../utils/nameConflicts";

interface SummaryTabProps {
  syncPreview: SyncPreview | null;
  // True only while a check round trip is actually in flight (user-triggered
  // checkNow, or the silent pre-publish re-check) — distinct from "never
  // checked yet", which is syncPreview === null && !isChecking.
  isChecking: boolean;
  hasChecked: boolean;
  onCheckNow: () => void;
  // Wall-clock time of the last completed check, for the "checked Xs ago"
  // caption next to the refresh icon — null until the first check lands.
  lastCheckedAt: number | null;
  nothingToSync: boolean;
  structuralChanges: StructuralChange[];
  existingCollections: ExistingCollection[];
  conflicts: { tokenRef: string; kind: "drift" | "conflict" }[];
  decisions: Record<string, SyncDecision>;
  onKeepAllConflicts: () => void;
  onOverrideAllConflicts: () => void;
  // Gate state, mirrored from RunDialog's footer button so the "why is Sync
  // disabled" explanation lives inline (not just in a hover tooltip that's
  // easy to miss on a disabled button).
  allDriftDecided: boolean;
  allNameConflictsDecided: boolean;
  driftItemCount: number;
  multiMode: boolean;
  themes: { name: string }[];
  pluginMode: string;
  skipScales: boolean;
  scope: SyncScope;
  setScope: (v: SyncScope) => void;
  previewWasInterrupted: boolean;
  setPreviewWasInterrupted: (v: boolean) => void;
  setActiveTab: (tab: RunDialogTab) => void;
  setChangesFilter: (filter: "all" | "create" | "modify" | "delete") => void;
  setHealthMetric: (metric: MetricKey) => void;
  onOpenConflicts: () => void;
}

// Same relative-time shape a "checked Xs ago" caption needs — short, no
// external date library, matches the plugin's existing lightweight style.
function timeAgo(fromMs: number, nowMs: number): string {
  const seconds = Math.round((nowMs - fromMs) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export function SummaryTab({
  syncPreview,
  isChecking,
  hasChecked,
  onCheckNow,
  lastCheckedAt,
  nothingToSync,
  structuralChanges,
  existingCollections,
  conflicts,
  decisions,
  onKeepAllConflicts,
  onOverrideAllConflicts,
  allDriftDecided,
  allNameConflictsDecided,
  driftItemCount,
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
  function goToChanges(filter: "all" | "create" | "modify" | "delete") {
    setChangesFilter(filter);
    setActiveTab("changes");
  }

  // Distinct collections that actually HAVE a change — existingCollections.length
  // counts every collection that exists at all (e.g. both Tokens and Source even
  // when only Source has any diffs), which overstates the "across N collections" claim.
  const changedCollectionCount = syncPreview ? new Set(syncPreview.items.map((i) => i.collection)).size : 0;

  const notCheckedYet = !hasChecked && !isChecking;

  // Mirrors ConflictList's own bulkValue computation exactly — same
  // decisionFor fallback (an explicit decision, else the kind's safe default,
  // else undecided) — so the inline buttons below reflect what's ACTUALLY
  // decided (and which one, if any, is uniformly applied) rather than always
  // looking like two equally-live options regardless of current state.
  const decisionFor = (c: { tokenRef: string; kind: "drift" | "conflict" }): "keep" | "revert" | null => (decisions[c.tokenRef] as "keep" | "revert" | undefined) ?? defaultNameConflictDecision(c.kind);
  const allKeepFigma = conflicts.length > 0 && conflicts.every((c) => decisionFor(c) === "keep");
  const allUseSystem = conflicts.length > 0 && conflicts.every((c) => decisionFor(c) === "revert");

  // Explains why the Sync button is disabled, INLINE — not just in the
  // footer's hover tooltip, which is easy to miss on a disabled button.
  // Ordered to match handleConfirmRun's own gating precedence in
  // useRunDialogState.ts (drift blocks before name conflicts do).
  const disabledReason = !hasChecked
    ? null // "not checked yet" already has its own empty-state messaging below
    : !allDriftDecided
      ? { text: `${driftItemCount} Figma edit${driftItemCount !== 1 ? "s" : ""} need a decision before syncing.`, tab: "value-drift" as RunDialogTab }
      : !allNameConflictsDecided
        ? { text: "Some naming conflicts still need a decision before syncing.", tab: "changes" as RunDialogTab }
        : null;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Warnings — surfaced first, above What Will Change/Health/Scope/
          Configuration. Several of these (conflicts, structural changes) block
          Sync until resolved, and none of them should require scrolling past
          three other sections to find out why the button won't enable. ──── */}
      {conflicts.length > 0 && (
        <Callout variant="warning" title={`${conflicts.length} name conflict${conflicts.length !== 1 ? "s" : ""} found`}>
          <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
            <button type="button" className="underline cursor-pointer hover:opacity-80 font-semibold" onClick={onOpenConflicts}>
              Review
            </button>
            <span className="opacity-50">|</span>
            <button
              type="button"
              className={`underline cursor-pointer hover:opacity-80 ${allUseSystem ? "font-semibold" : ""}`}
              aria-pressed={allUseSystem}
              onClick={onOverrideAllConflicts}
            >
              Use System Names for All{allUseSystem ? " ✓" : ""}
            </button>
            <span className="opacity-50">|</span>
            <button
              type="button"
              className={`underline cursor-pointer hover:opacity-80 ${allKeepFigma ? "font-semibold" : ""}`}
              aria-pressed={allKeepFigma}
              onClick={onKeepAllConflicts}
            >
              Keep Figma Names for All{allKeepFigma ? " ✓" : ""}
            </button>
          </div>
        </Callout>
      )}

      {disabledReason && (
        <Callout variant="danger" title="Sync is blocked">
          {disabledReason.text}{" "}
          <button type="button" className="underline cursor-pointer hover:opacity-80 font-semibold" onClick={() => setActiveTab(disabledReason.tab)}>
            Resolve →
          </button>
        </Callout>
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

      {/* ── What will change ────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-0.5">
          <SectionLabel className="text-n-tx-secondary">What Will Change</SectionLabel>
          {/* Manual-only: no auto check on open or on edit — see
              useRunDialogState's onDialogOpen/checkNow. A refresh icon replaces
              the initial button once a check has actually run, so the user can
              re-compare on demand without leaving this section. The "checked
              Xs ago" caption makes the silent pre-publish safety net visible —
              otherwise a stale-but-hasChecked review looks identical to a
              fresh one until Sync is actually clicked. */}
          {hasChecked && !isChecking && (
            <div className="flex items-center gap-1.5">
              {lastCheckedAt !== null && <LastCheckedCaption checkedAt={lastCheckedAt} />}
              <button
                type="button"
                onClick={onCheckNow}
                title="Re-check against Figma"
                aria-label="Re-check against Figma"
                className="text-n-tx-dim hover:text-n-tx-primary transition-colors cursor-pointer p-0.5 -m-0.5"
              >
                <IconReset className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
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
          ) : notCheckedYet ? (
            <EmptyState
              icon={<IconLayers className="w-5 h-5" />}
              title="Not compared yet"
              description="See what will be created, updated, or removed in Figma before syncing."
              action={<Button variant="secondary" size="sm" label="Compare Changes with Figma" onClick={onCheckNow} />}
            />
          ) : nothingToSync || !syncPreview ? (
            <EmptyState icon={<IconCheck className="w-5 h-5" />} title="Up to date" description="Figma variables already match the current configuration — nothing to sync." />
          ) : (
            <div className="flex flex-col gap-2 py-1">
              <div className="grid grid-cols-3 gap-1.5">
                <StatChip count={syncPreview.toCreate} label="Create" variant="success" onClick={() => goToChanges("create")} />
                <StatChip count={syncPreview.toModify} label="Modify" variant="accent" onClick={() => goToChanges("modify")} />
                <StatChip count={syncPreview.toDelete} label="Delete" variant="danger" onClick={() => goToChanges("delete")} />
              </div>
              <Caption className="text-n-tx-dim">
                {syncPreview.total} variable change{syncPreview.total !== 1 ? "s" : ""} across{" "}
                {changedCollectionCount > 0
                  ? `${changedCollectionCount} collection${changedCollectionCount !== 1 ? "s" : ""}`
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
        {skipScales && (
          <HelperText className="text-n-tx-dim px-0.5">
            {pluginMode === "direct" ? "Direct mode — no scale collection will be created." : "Scale collection disabled in Settings."}
          </HelperText>
        )}
        <ScopeChecklist scope={scope} setScope={setScope} showScaleRow={!skipScales} />
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
                <div className="flex gap-1 flex-wrap">
                  {existingCollections.map((c) => (
                    <Badge key={c.id} variant="outline" size="xs">{c.name}</Badge>
                  ))}
                </div>
              ) : (
                <HelperText className="text-n-tx-dim">Will be created</HelperText>
              )
            }
          />
          {themes.length > 0 && (
            <SmallRow
              label={`Theme${themes.length !== 1 ? "s" : ""}`}
              control={
                <div className="flex gap-1 flex-wrap">
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
    </div>
  );
}

// ── Health summary ─────────────────────────────────────────────────────────────

// The metric with the most issues — where "View details" and a tile click
// without an explicit selection should land. Falls back to "adjustments" when
// nothing has issues, matching the tile row's own default.
function topIssueMetric(report: ReturnType<typeof useHealthReport>): MetricKey {
  if (!report) return "adjustments";
  const counts: [MetricKey, number][] = [
    ["adjustments", report.adjustments.length],
    ["collisions", report.nameCollisions.length],
    ["drift", report.modeDrift.length],
    ["inversions", report.inversions.length],
  ];
  const top = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return top[1] > 0 ? top[0] : "adjustments";
}

function HealthSummary({ onViewHealth }: { onViewHealth: (metric: MetricKey) => void }) {
  const report = useHealthReport();
  const issueCount = report?.issueCount ?? null;
  const defaultMetric = topIssueMetric(report);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-0.5">
        <SectionLabel className="text-n-tx-secondary">Health</SectionLabel>
        <button type="button" onClick={() => onViewHealth(defaultMetric)} className="text-[11px] font-medium text-n-tx-dim hover:text-n-tx-primary underline-offset-2 hover:underline transition-colors cursor-pointer">
          View details →
        </button>
      </div>
      <SettingsCard className="!space-y-0 !p-2">
        <MetricTileRow selected={defaultMetric} onSelect={onViewHealth} onNavigateToHealth={undefined} />
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

function ScopeChecklist({ scope, setScope, showScaleRow }: { scope: SyncScope; setScope: (v: SyncScope) => void; showScaleRow: boolean }) {
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

  // With no scale collection available (showScaleRow false), Tokens is the only
  // thing SyncScope can represent — "off" has no valid scope value to fall back
  // to (turning it off would silently re-introduce a scale-only sync via
  // setScope("scale")), so the row is locked on rather than toggleable.
  function toggleRoles() {
    if (!showScaleRow) return;
    if (rolesOn) setScope("scale");
    else setScope(scaleOn ? "all" : "roles");
  }

  return (
    <SettingsCard className="!space-y-0 divide-y divide-n-br-hairline">
      {showScaleRow && (
        <CollectionRow
          label="Scale"
          description="Primitive color collection"
          checked={scaleOn}
          onToggle={toggleScale}
          control={<Input size="sm" value={scaleCollectionName} onChange={(e) => setProjectField("scaleCollectionName", e.target.value)} disabled={!scaleOn} />}
        />
      )}
      <CollectionRow
        label="Tokens"
        description="Semantic role collection"
        checked={rolesOn || !showScaleRow}
        onToggle={toggleRoles}
        control={<Input size="sm" value={tokenCollectionName} onChange={(e) => setProjectField("tokenCollectionName", e.target.value)} disabled={!(rolesOn || !showScaleRow)} />}
      />
      <CollectionRow
        label="Source Colors"
        description="Raw hex reference collection"
        checked={includeSourceColors}
        onToggle={() => setProjectField("includeSourceColors", !includeSourceColors)}
        control={<Input size="sm" value={sourceCollectionName} onChange={(e) => setProjectField("sourceCollectionName", e.target.value)} disabled={!includeSourceColors} />}
      />
    </SettingsCard>
  );
}

// ── Last-checked caption ─────────────────────────────────────────────────────
// Ticks once a minute — no need for a snappier interval on a caption whose
// finest unit is "Xs ago" for the first minute anyway, and a slow tick keeps
// this from being a real re-render cost while the dialog sits open.

function LastCheckedCaption({ checkedAt }: { checkedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return <MicroText className="text-n-tx-dim whitespace-nowrap">Checked {timeAgo(checkedAt, now)}</MicroText>;
}

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
