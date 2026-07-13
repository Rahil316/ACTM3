import { useState, useMemo } from "react";
import { useHealthReport } from "./useHealthReport";
import type { AdjustmentItem, NameCollisionItem, ModeDriftItem, InversionItem } from "./useHealthReport";
import { SegmentedControl } from "../../../../components/SegmentedControl";
import { SettingsCard } from "../../../../components/SettingsCard";
import { Badge } from "../../../../components/Badge";
import { EmptyState } from "../../../../components/EmptyState";
import { Mono, Caption, SectionLabel, SheetTitle } from "../../../../components/typography";
import { Collapsible } from "../../../../components/Collapsible";
import { VariationTable } from "../../../../components/cards/VariationTable";
import { IconActivity, IconCheck, IconAlertTriangle, IconXCircle, IconTarget, IconTag, IconSunMoon, IconArrowUpDown } from "../../../../components/icons";
import { useProjectStore } from "../../../../store/projectStore";

// ── Metric tile ───────────────────────────────────────────────────────────────

export type TileState = "good" | "warn" | "fail";

function TileIcon({ state }: { state: TileState }) {
  if (state === "good") return <IconCheck className="size-4 text-s-tx-muted shrink-0" />;
  if (state === "warn") return <IconAlertTriangle className="size-4 text-w-tx-muted shrink-0" />;
  return <IconXCircle className="size-4 text-d-tx-muted shrink-0" />;
}

export function MetricTile({ label, count, total, state, selected, onClick }: { label: string; count: number; total: number; state: TileState; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col gap-1.5 items-start rounded-xl border p-2.5 cursor-pointer transition-all text-left w-full bg-n-bg-card ${selected ? "border-n-br-default ring-1 ring-n-br-default" : "border-n-br-subtle opacity-70 hover:opacity-100"}`}>
      <div className="flex items-center gap-1.5 w-full">
        <span className="w-full text-[18px] font-bold leading-none tabular-nums text-n-tx-primary">
          {count}
          {total > 0 && <span className="text-[12px] font-normal ml-0.5 text-n-tx-muted"> {` /${total}`}</span>}
        </span>
        <TileIcon state={state} />
      </div>
      <span className="text-[11px] tracking-[0.5px] leading-snug font-semibold text-n-tx-secondary">{label}</span>
    </button>
  );
}

// ── Rating badge ──────────────────────────────────────────────────────────────

const RATING_VARIANT: Record<string, "success" | "warning" | "danger" | "muted"> = {
  AAA: "success",
  AA: "success",
  "AA Large Text": "warning",
  Fail: "danger",
};

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating)
    return (
      <Badge variant="muted" size="xs">
        —
      </Badge>
    );
  return (
    <Badge variant={RATING_VARIANT[rating] ?? "muted"} size="xs">
      {rating}
    </Badge>
  );
}

// ── Adjustments detail ────────────────────────────────────────────────────────

type AdjustmentSeverity = "rating-shift" | "significant" | "negligible";

function adjustmentSeverity(item: AdjustmentItem): AdjustmentSeverity {
  if (item.ratingShift) return "rating-shift";
  if (item.delta >= 1.0) return "significant";
  return "negligible";
}

const SEVERITY_ORDER: AdjustmentSeverity[] = ["rating-shift", "significant", "negligible"];

function AdjustmentsDetail({ items }: { items: AdjustmentItem[] }) {
  const [tab, setTab] = useState<AdjustmentSeverity | "all">("all");

  if (items.length === 0) {
    return <EmptyState icon={<IconTarget className="w-5 h-5" />} title="No adjustments" description="All tokens resolved to their exact contrast target — no scale snapping occurred." />;
  }

  const grouped = SEVERITY_ORDER.reduce<Record<AdjustmentSeverity, AdjustmentItem[]>>(
    (acc, s) => {
      acc[s] = [];
      return acc;
    },
    {} as Record<AdjustmentSeverity, AdjustmentItem[]>,
  );
  for (const item of items) grouped[adjustmentSeverity(item)].push(item);

  const visible = tab === "all" ? items : grouped[tab];
  const tabs: { key: AdjustmentSeverity | "all"; label: string; count: number }[] = [
    { key: "all", label: "All", count: items.length },
    { key: "rating-shift", label: "Rating Shift", count: grouped["rating-shift"].length },
    { key: "significant", label: "Significant (≥1.0)", count: grouped["significant"].length },
    { key: "negligible", label: "Negligible (<1.0)", count: grouped["negligible"].length },
  ];

  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl segments={tabs.map((t) => ({ value: t.key, label: t.label, count: t.count }))} value={tab} onChange={setTab} />

      <SettingsCard className="!space-y-0 !py-0">
        {visible.map((item, idx) => (
          // Index suffix guards against duplicate keys when tokenName collides
          // across different color/role/variation combos — exactly the case
          // the Name Collisions detail (below) is built to detect.
          <div key={`${item.tokenName}-${item.theme}-${idx}`} className={`flex items-center gap-2 py-1.5 ${idx < visible.length - 1 ? "border-b border-n-br-hairline" : ""}`}>
            <div className="flex-1 min-w-0">
              <Mono className="text-n-tx-secondary truncate">{item.tokenName}</Mono>
              <Caption className="text-n-tx-dim">{item.theme}</Caption>
            </div>
            {item.ratingShift && (
              <div className="flex items-center gap-1 shrink-0">
                <RatingBadge rating={item.targetRating} />
                <Caption className="text-n-tx-dim">→</Caption>
                <RatingBadge rating={item.achievedRating} />
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
              <Caption className="text-n-tx-dim tabular-nums">{item.target.toFixed(1)}</Caption>
              <Caption className="text-n-tx-dim">→</Caption>
              <span className="text-[10px] font-semibold text-w-tx-muted tabular-nums">{item.achieved.toFixed(1)}</span>
              <Caption className="text-n-tx-dim tabular-nums">(−{item.delta.toFixed(1)})</Caption>
            </div>
          </div>
        ))}
      </SettingsCard>
    </div>
  );
}

// ── Name collisions detail ────────────────────────────────────────────────────

function NameCollisionsDetail({ items }: { items: NameCollisionItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon={<IconTag className="w-5 h-5" />} title="No name collisions" description="All token names are unique — no Figma variable conflicts." />;
  }
  return (
    <SettingsCard className="!space-y-0 !py-0">
      {items.map((item, idx) => (
        <div key={item.tokenName} className={`flex flex-col gap-1 py-1.5 ${idx < items.length - 1 ? "border-b border-n-br-hairline" : ""}`}>
          <Mono className="text-d-tx-muted truncate">{item.tokenName}</Mono>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {item.duplicates.map((d, i) => (
              <Caption key={i} className="text-n-tx-dim">
                {d.color} · {d.role} · {d.variation}
              </Caption>
            ))}
          </div>
        </div>
      ))}
    </SettingsCard>
  );
}

// ── Mode drift detail ─────────────────────────────────────────────────────────

function ModeDriftDetail({ items }: { items: ModeDriftItem[] }) {
  const roles = useProjectStore((s) => s.projectStore.roles);
  // items are already filtered to drift cases at computation time (useHealthReport.ts) — no further filter needed here.
  if (items.length === 0) {
    return <EmptyState icon={<IconSunMoon className="w-5 h-5" />} title="No cross-mode drift" description="All tokens maintain their WCAG rating category across every theme." />;
  }

  // Collect all theme names in order of first appearance
  const themes = Array.from(new Set(items.flatMap((i) => i.modes.map((m) => m.theme))));

  // grid: token col + one col per theme
  const cols = `1fr ${themes.map(() => "80px").join(" ")}`;

  return (
    <div className="rounded-xl border border-n-br-default overflow-hidden">
      {/* Header row */}
      <div className="grid px-2 py-1 bg-n-bg-app border-b border-n-br-default gap-2" style={{ gridTemplateColumns: cols }}>
        <span className="text-[10px] font-bold text-n-tx-muted">Token</span>
        {themes.map((t) => (
          <span key={t} className="text-[10px] font-bold text-n-tx-muted truncate text-center">
            {t}
          </span>
        ))}
      </div>

      {/* Data rows */}
      {items.map((item, idx) => {
        const byTheme = Object.fromEntries(item.modes.map((m) => [m.theme, m]));

        const role = roles.find((r) => r.name === item.role);
        const variationTarget = role?.variations?.find((v) => v.name === item.variation)?.target ?? null;

        return (
          <div key={item.tokenName} className={`grid px-2 py-1.5 items-center gap-2 ${idx % 2 ? "bg-n-bg-app" : ""} ${idx < items.length - 1 ? "border-b border-n-br-subtle" : ""}`} style={{ gridTemplateColumns: cols }}>
            <div className="flex flex-col gap-0.5 min-w-0">
              <Mono className="text-n-tx-secondary truncate">{item.tokenName}</Mono>
              <Caption className="text-n-tx-dim">
                {item.role} · {item.variation}
                {variationTarget != null ? ` · target ${variationTarget}` : ""}
              </Caption>
            </div>
            {themes.map((t) => {
              const mode = byTheme[t];
              return (
                <div key={t} className="flex flex-col items-center gap-0.5 py-0.5">
                  {mode?.ratio != null && <Caption className="text-n-tx-dim tabular-nums">{mode.ratio.toFixed(2)}</Caption>}
                  <RatingBadge rating={mode?.rating ?? null} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Inversions detail ─────────────────────────────────────────────────────────

function InversionRow({ item }: { item: InversionItem }) {
  const [open, setOpen] = useState(false);
  const { roles, scaleLength, canEditNames, globalVariations } = useProjectStore((s) => ({
    roles: s.projectStore.roles,
    scaleLength: s.projectStore.scaleLength,
    canEditNames: s.projectStore.canEditRoleVariants,
    globalVariations: s.projectStore.variations ?? [],
  }));
  const roleIdx = roles.findIndex((r) => r.name === item.role);
  const role = roles[roleIdx];

  // Compute which row indices break monotonicity so they can be highlighted
  const brokenRows = useMemo(() => {
    const targets = item.variations.map((v) => v.target);
    if (targets.some((t) => t == null)) return new Set<number>();
    const nums = targets as number[];
    // Determine expected direction from the majority trend
    const ascending = nums[nums.length - 1] >= nums[0];
    const broken = new Set<number>();
    for (let i = 1; i < nums.length; i++) {
      if (ascending ? nums[i] < nums[i - 1] : nums[i] > nums[i - 1]) {
        broken.add(i);
      }
    }
    return broken;
  }, [item.variations]);

  return (
    <Collapsible
      open={open}
      onToggle={() => setOpen((v) => !v)}
      header={
        <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
          <Mono className="text-n-tx-secondary">{item.role}</Mono>
        </div>
      }
    >
      {roleIdx >= 0 && role && <VariationTable variations={role.variations ?? []} canEdit={canEditNames} idx={roleIdx} scaleLength={scaleLength} highlightRows={brokenRows} globalVariations={globalVariations} />}
    </Collapsible>
  );
}

function InversionsDetail({ items }: { items: InversionItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon={<IconArrowUpDown className="w-5 h-5" />} title="No inversions" description="All variation hierarchies are monotonically consistent across every role." />;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <InversionRow key={item.role} item={item} />
      ))}
    </div>
  );
}

// ── Metric types ──────────────────────────────────────────────────────────────

export type MetricKey = "adjustments" | "collisions" | "drift" | "inversions";

export const METRIC_LABELS: Record<MetricKey, string> = {
  adjustments: "Scale Adjustments",
  collisions: "Name Collisions",
  drift: "Cross-Mode Drift",
  inversions: "Variations Inversions",
};

const METRIC_DESCRIPTIONS: Record<MetricKey, { good: string; issue: string }> = {
  adjustments: {
    good: "All tokens resolved to their exact contrast target — no scale snapping occurred.",
    issue: "Tokens that couldn't hit their contrast target and snapped to the nearest scale step.",
  },
  collisions: {
    good: "All token names are unique — no Figma variable conflicts.",
    issue: "Multiple color/role/variation combinations produce the same token name. Figma will silently overwrite one.",
  },
  drift: {
    good: "All tokens maintain their WCAG rating category across every theme.",
    issue: "Tokens whose WCAG rating changes category between themes — passes in one mode, fails in another.",
  },
  inversions: {
    good: "All variation hierarchies are monotonically consistent across every role.",
    issue: "Roles where variation contrast is non-monotonic — the expected hierarchy between default, hover, and active is broken.",
  },
};

// ── Metric tile row (exported for reuse) ─────────────────────────────────────

export interface MetricTileRowProps {
  selected: MetricKey;
  onSelect: (key: MetricKey) => void;
  /** When provided, clicking a tile navigates there first, then selects. */
  onNavigateToHealth?: () => void;
}

export function MetricTileRow({ selected, onSelect, onNavigateToHealth }: MetricTileRowProps) {
  const report = useHealthReport();
  const driftCritical = report ? report.modeDrift.length : 0;

  const metrics: { key: MetricKey; count: number; total: number; state: TileState }[] = [
    { key: "adjustments", count: report?.adjustments.length ?? 0, total: report?.totalTokens ?? 0, state: !report || report.adjustments.length === 0 ? "good" : "warn" },
    { key: "collisions",  count: report?.nameCollisions.length ?? 0, total: 0,                     state: !report || report.nameCollisions.length === 0 ? "good" : "fail" },
    { key: "drift",       count: driftCritical,                       total: report?.totalTokens ?? 0, state: !report || driftCritical === 0 ? "good" : "fail" },
    { key: "inversions",  count: report?.inversions.length ?? 0,      total: 0,                     state: !report || report.inversions.length === 0 ? "good" : "warn" },
  ];

  function handleClick(key: MetricKey) {
    if (onNavigateToHealth) onNavigateToHealth();
    onSelect(key);
  }

  return (
    <div className={`grid grid-cols-4 gap-1.5 ${!report ? "opacity-50" : ""}`}>
      {metrics.map((m) => (
        <MetricTile
          key={m.key}
          label={METRIC_LABELS[m.key]}
          count={m.count}
          total={m.total}
          state={m.state}
          selected={!onNavigateToHealth && selected === m.key}
          onClick={() => handleClick(m.key)}
        />
      ))}
    </div>
  );
}

// ── Health tab ────────────────────────────────────────────────────────────────

export function HealthTab({ initialMetric }: { initialMetric?: MetricKey }) {
  const report = useHealthReport();
  const [selected, setSelected] = useState<MetricKey>(initialMetric ?? "adjustments");

  if (!report) {
    return <EmptyState icon={<IconActivity className="w-5 h-5" />} title="No health data yet" description="Add at least one color, role, and theme — then run a preview to see quality metrics." />;
  }

  const driftCritical = report.modeDrift.length;
  const selectedCount = selected === "adjustments" ? report.adjustments.length : selected === "collisions" ? report.nameCollisions.length : selected === "drift" ? driftCritical : report.inversions.length;
  const desc = selectedCount === 0 ? METRIC_DESCRIPTIONS[selected].good : METRIC_DESCRIPTIONS[selected].issue;

  return (
    <div className="flex flex-col gap-3">
      {/* Score summary */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <SectionLabel className="text-n-tx-secondary">Health Report</SectionLabel>
        <div className="flex items-center gap-1.5">
          <Caption className="text-n-tx-dim">{report.totalTokens} tokens</Caption>
          <Badge variant={report.issueCount === 0 ? "success" : report.issueCount < 5 ? "warning" : "danger"} size="xs" dot>
            {report.issueCount === 0 ? "All healthy" : `${report.issueCount} issue${report.issueCount !== 1 ? "s" : ""}`}
          </Badge>
        </div>
      </div>

      {/* metric tile row */}
      <MetricTileRow selected={selected} onSelect={setSelected} />

      {/* Detail panel */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <SheetTitle className="text-n-tx-secondary">{METRIC_LABELS[selected]}</SheetTitle>
          {selectedCount === 0 && (
            <Badge variant="success" size="xs" dot>
              Healthy
            </Badge>
          )}
        </div>
        <Caption className="text-n-tx-dim px-0.5">{desc}</Caption>

        {selected === "adjustments" && <AdjustmentsDetail items={report.adjustments} />}
        {selected === "collisions" && <NameCollisionsDetail items={report.nameCollisions} />}
        {selected === "drift" && <ModeDriftDetail items={report.modeDrift} />}
        {selected === "inversions" && <InversionsDetail items={report.inversions} />}
      </div>
    </div>
  );
}
