import { useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore, SCALE_ALGORITHM_OPTIONS, SOLVER_MODE_OPTIONS } from "../store/appStore";
import { useUiStore, VALID_SCALES, VALID_THEMES, VALID_LANGUAGES } from "../store/uiStore";
import { takeSnapshot, restoreSnapshot, clearSnapshot } from "../store/snapshots";
import { Modal, ModalHeader } from "../components/Modal";
import { TabBar } from "../components/TabBar";
import { SettingsCard, PanelRow, SmallRow } from "../components/SettingsCard";
import { Toggle } from "../components/Toggle";
import { Select } from "../components/Select";
import { SegmentedControl } from "../components/SegmentedControl";
import { Input } from "../components/Input";
import { Button, ActionButton } from "../components/Button";
import { ListRow, ListHeader } from "../components/ListRow";
import { SectionLabel, HelperText, CardTitle } from "../components/typography";
import type { SettingsTab, TokenNameSegment } from "../types/state";

// ── Token segment drag pill ──────────────────────────────────────────────────

const SEGMENT_LABELS: Record<TokenNameSegment, string> = {
  color: "Color",
  role: "Role",
  variation: "Variation",
};

function SortableSegmentPill({ id }: { id: TokenNameSegment }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-accent-subtle border border-accent text-[11px] font-semibold text-accent cursor-grab select-none">
      <span className="text-[9px] opacity-60">⠿</span>
      {SEGMENT_LABELS[id]}
    </div>
  );
}

// ── Tokens tab ───────────────────────────────────────────────────────────────

function TokensTab() {
  const appState = useAppStore((s) => s.appState);
  const setAppField = useAppStore((s) => s.setAppField);

  const pluginMode = appState.pluginMode;
  const isScaleMode = pluginMode === "scale";

  const algoOptions = SCALE_ALGORITHM_OPTIONS.map((a) => ({ value: a, label: a }));
  const modeSegments = [
    { value: "scale", label: "Scale" },
    { value: "direct", label: "Direct" },
  ] as const;
  const scopeSegments = [
    { value: "color", label: "Per Color" },
    { value: "role", label: "Per Role" },
  ] as const;

  const scaleStepNamesRaw = useAppStore((s) => s.appState.scaleStepNames);
  const scaleStepNames = scaleStepNamesRaw ?? [];
  const setScaleStepName = useAppStore((s) => s.setScaleStepName);
  const addScaleStepName = useAppStore((s) => s.addScaleStepName);
  const removeScaleStepName = useAppStore((s) => s.removeScaleStepName);
  const [stepLabelsCollapsed, setStepLabelsCollapsed] = useState(true);
  const [scaleLengthDraft, setScaleLengthDraft] = useState<string>(String(appState.scaleLength));

  const tokenNameSegments = appState.tokenNameSegments ?? ["color", "role", "variation"];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleSegmentDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tokenNameSegments.indexOf(active.id as TokenNameSegment);
    const newIdx = tokenNameSegments.indexOf(over.id as TokenNameSegment);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove([...tokenNameSegments], oldIdx, newIdx);
    setAppField("tokenNameSegments", reordered);
  }

  // Live preview of resulting token name
  const exampleColor = appState.colors[0]?.name || "Color";
  const exampleRole = appState.roles[0]?.name || "Role";
  const exampleVariation = appState.variations?.[0]?.name || "Subtle";
  const segmentValues: Record<TokenNameSegment, string> = {
    color: exampleColor,
    role: exampleRole,
    variation: exampleVariation,
  };
  const namePreview = tokenNameSegments.map((s) => segmentValues[s]).join(" / ");
  function ModeSettings(isScale: boolean): JSX.Element {
    return isScale ? (
      <SettingsCard>
        <SectionLabel>Color Algorithm</SectionLabel>
        <PanelRow label="Uniform Algorithm" description="Apply the same algorithm to all colors." control={<Toggle on={appState.useUniformAlgorithm} onChange={() => setAppField("useUniformAlgorithm", !appState.useUniformAlgorithm)} />} />
        {appState.useUniformAlgorithm && <SmallRow label="Algorithm" control={<Select size="md" options={algoOptions} value={appState.scaleAlgorithm} onChange={(e) => setAppField("scaleAlgorithm", e.target.value as typeof appState.scaleAlgorithm)} />} />}
        {!appState.useUniformAlgorithm && (
          <PanelRow
            label="Algorithm Scope"
            description={appState.algorithmScopeLevel == "color" ? "Select Algorithm for each color." : "Select Algorithm for each role."}
            control={<SegmentedControl segments={scopeSegments as unknown as { value: string; label: string }[]} value={appState.algorithmScopeLevel} onChange={(v) => setAppField("algorithmScopeLevel", v as "color" | "role")} />}
          />
        )}
      </SettingsCard>
    ) : (
      <SettingsCard>
        <SectionLabel>Color Algorithm</SectionLabel>
        <PanelRow label="Uniform Algorithm" description="Apply the same algorithm to all colors." control={<Toggle on={appState.useUniformAlgorithm} onChange={() => setAppField("useUniformAlgorithm", !appState.useUniformAlgorithm)} />} />
        {appState.useUniformAlgorithm && (
          <SmallRow
            label="Solver Algorithm"
            control={<Select size="md" options={SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }))} value={appState.solverMode} onChange={(e) => setAppField("solverMode", e.target.value as typeof appState.solverMode)} />}
          />
        )}
        {!appState.useUniformAlgorithm && (
          <SmallRow
            label="Algorithm Scope"
            control={<SegmentedControl segments={scopeSegments as unknown as { value: string; label: string }[]} value={appState.algorithmScopeLevel} onChange={(v) => setAppField("algorithmScopeLevel", v as "color" | "role")} />}
          />
        )}
      </SettingsCard>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mode */}
      <SettingsCard>
        <PanelRow
          label="Plugin Mode"
          description={isScaleMode ? "Generate a full color scale from a seed color." : "Solve token values directly against themes."}
          control={<SegmentedControl segments={modeSegments as unknown as { value: string; label: string }[]} value={pluginMode} onChange={(v) => setAppField("pluginMode", v as "scale" | "direct")} />}
        />
        {isScaleMode && (
          <SmallRow
            label="Scale Length"
            control={
              <Input
                size="sm"
                type="number"
                value={scaleLengthDraft}
                min="5"
                max="100"
                step="1"
                width={undefined}
                onChange={(e) => {
                  setScaleLengthDraft(e.target.value);
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= 5 && v <= 100) setAppField("scaleLength", v);
                }}
                onBlur={() => {
                  const v = parseInt(scaleLengthDraft);
                  if (isNaN(v) || v < 5 || v > 100) setScaleLengthDraft(String(appState.scaleLength));
                }}
              />
            }
          />
        )}
      </SettingsCard>

      {/* Scale settings */}
      {ModeSettings(isScaleMode)}

      {/* Token naming */}
      <SettingsCard>
        <SectionLabel>Token Naming & Description</SectionLabel>
        {/* Variable structure */}
        {/* Drag-reorderable name segment pills */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-start w-full">
              <SectionLabel>Naming Structure</SectionLabel>
              <HelperText className="font-medium">Drag to reorder the token name</HelperText>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSegmentDragEnd}>
              <SortableContext items={tokenNameSegments} strategy={horizontalListSortingStrategy}>
                <div className="flex items-center gap-2">
                  {tokenNameSegments.map((seg, i) => (
                    <div key={seg} className="flex items-center gap-1">
                      <SortableSegmentPill id={seg} />
                      {i < tokenNameSegments.length - 1 && <span className="text-[11px] text-text-dim">/</span>}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Live preview */}
          <HelperText className="font-mono bg-bg-input rounded-[4px] p-2">{namePreview}</HelperText>
        </div>
        <PanelRow label="Use Shorthand for Colors" control={<Toggle on={appState.useShorthandColors} onChange={() => setAppField("useShorthandColors", !appState.useShorthandColors)} />} />
        <PanelRow label="Use Shorthand for Roles" control={<Toggle on={appState.useShorthandRoles} onChange={() => setAppField("useShorthandRoles", !appState.useShorthandRoles)} />} />
        <PanelRow label="Use Shorthand for Variations" control={<Toggle on={appState.useShorthandVariations} onChange={() => setAppField("useShorthandVariations", !appState.useShorthandVariations)} />} />
        <PanelRow label="Use Shorthand for Steps" control={<Toggle on={appState.useShorthandSteps} onChange={() => setAppField("useShorthandSteps", !appState.useShorthandSteps)} />} />
        <PanelRow label="Include Descriptions" control={<Toggle on={appState.includeDescriptions} onChange={() => setAppField("includeDescriptions", !appState.includeDescriptions)} />} />
      </SettingsCard>

      {/* Collections */}
      <SettingsCard>
        <SectionLabel>Figma Collections</SectionLabel>
        <SmallRow label="Token Collection Name" control={<Input size="md" value={appState.tokenCollectionName} onChange={(e) => setAppField("tokenCollectionName", e.target.value)} />} />
        {isScaleMode && (
          <>
            <PanelRow label="Include Scale Collection" control={<Toggle on={appState.includeColorScalesCollection} onChange={() => setAppField("includeColorScalesCollection", !appState.includeColorScalesCollection)} />} />
            {appState.includeColorScalesCollection && <SmallRow label="Scale Collection Name" control={<Input size="md" value={appState.scaleCollectionName} onChange={(e) => setAppField("scaleCollectionName", e.target.value)} />} />}
          </>
        )}
        <PanelRow label="Include Source Colors" description="Creates a separate collection for seed hex values." control={<Toggle on={appState.includeSourceColors} onChange={() => setAppField("includeSourceColors", !appState.includeSourceColors)} />} />
        {appState.includeSourceColors && (
          <>
            <SmallRow label="Source Collection Name" control={<Input size="md" value={appState.sourceCollectionName} onChange={(e) => setAppField("sourceCollectionName", e.target.value)} />} />
            <SmallRow label="Alpha Tint Values (CSV %)" control={<Input size="lg" value={appState.alphaValues} placeholder="Leave empty to skip, e.g. 10, 25, 50, 75, 90" onChange={(e) => setAppField("alphaValues", e.target.value)} />} />
          </>
        )}
      </SettingsCard>

      {/* Step labels */}
      {isScaleMode && (
        <SettingsCard>
          <button
            type="button"
            className="flex items-center justify-between w-full text-left"
            onClick={() => setStepLabelsCollapsed((c) => !c)}
          >
            <SectionLabel>Step Labels</SectionLabel>
            <span className="text-text-muted text-[10px]">{stepLabelsCollapsed ? '▸' : '▾'}</span>
          </button>
          {!stepLabelsCollapsed && (
            <>
              <HelperText className="mt-1">Names for each scale step. Always {appState.scaleLength} entries — leave blank to use step numbers.</HelperText>
              {scaleStepNames.length === 0 && (
                <ActionButton label={`+ Enable Step Labels`} onClick={addScaleStepName} />
              )}
              {scaleStepNames.length > 0 && (
                <>
                  <ListHeader columns={["Name", "Short"]} withRemoveButton />
                  {scaleStepNames.map((step, i) => (
                    <ListRow key={step._id} onRemove={() => removeScaleStepName(i)} removeAriaLabel="Clear step label">
                      <Input size="sm" value={step.name} placeholder={`Step ${i + 1}`} onChange={(e) => setScaleStepName(i, "name", e.target.value)} />
                      <Input size="sm" value={step.shorthand ?? ""} placeholder="Short" onChange={(e) => setScaleStepName(i, "shorthand", e.target.value)} />
                    </ListRow>
                  ))}
                  <ActionButton label="− Disable Step Labels" onClick={() => { for (let k = scaleStepNames.length - 1; k >= 0; k--) removeScaleStepName(k); }} />
                </>
              )}
            </>
          )}
        </SettingsCard>
      )}
    </div>
  );
}

// ── Roles tab ────────────────────────────────────────────────────────────────

function RolesTab() {
  const appState = useAppStore((s) => s.appState);
  const setAppField = useAppStore((s) => s.setAppField);
  const variationsRaw = useAppStore((s) => s.appState.variations);
  const variations = variationsRaw ?? [];
  const setVariation = useAppStore((s) => s.setVariation);
  const addVariation = useAppStore((s) => s.addVariation);
  const removeVariation = useAppStore((s) => s.removeVariation);

  return (
    <div className="flex flex-col gap-3">
      <SettingsCard>
        <SectionLabel>Role Defaults</SectionLabel>
        <PanelRow
          label="Per-Role Variation Override"
          description="Allow each role to define its own variation list."
          control={<Toggle on={appState.perRoleVariationOverride} onChange={() => setAppField("perRoleVariationOverride", !appState.perRoleVariationOverride)} />}
        />
      </SettingsCard>

      <SettingsCard>
        <SectionLabel>Shared Variations</SectionLabel>
        <HelperText>Define the variation levels applied across all roles.</HelperText>
        {variations.length > 0 && (
          <>
            <ListHeader columns={["Name", "Short"]} withDragHandle withRemoveButton />
            {variations.map((v, i) => (
              <ListRow key={v._id} onRemove={() => removeVariation(i)} removeDisabled={variations.length <= 1} removeAriaLabel="Remove variation">
                <Input size="sm" value={v.name ?? ""} placeholder="Name" onChange={(e) => setVariation(i, "name", e.target.value)} />
                <Input size="sm" value={v.shorthand ?? ""} placeholder="Short" onChange={(e) => setVariation(i, "shorthand", e.target.value)} />
              </ListRow>
            ))}
          </>
        )}
        <ActionButton label="+ Add Variation" onClick={addVariation} />
      </SettingsCard>
    </div>
  );
}

// ── Plugin tab ───────────────────────────────────────────────────────────────

function PluginTab() {
  const uiPrefs = useUiStore((s) => s.uiPrefs);
  const setScale = useUiStore((s) => s.setScale);
  const setTheme = useUiStore((s) => s.setTheme);
  const setLang = useUiStore((s) => s.setLanguage);

  const scaleOptions = VALID_SCALES.map((s) => ({ value: String(s), label: `${Math.round(s * 100)}%` }));
  const uiThemeSegments = VALID_THEMES.map((t) => ({
    value: t,
    label: t.charAt(0).toUpperCase() + t.slice(1),
  }));
  const langOptions = VALID_LANGUAGES.map((l) => ({
    value: l,
    label: l === "en" ? "English" : l === "es" ? "Español" : "हिंदी",
  }));

  return (
    <div className="flex flex-col gap-3">
      <SettingsCard>
        <SectionLabel>Appearance</SectionLabel>
        <SmallRow label="UI Theme" control={<SegmentedControl segments={uiThemeSegments} value={uiPrefs.theme} onChange={(v) => setTheme(v as typeof uiPrefs.theme)} />} />
        <SmallRow label="UI Scale" control={<Select size="md" options={scaleOptions} value={String(uiPrefs.scale)} onChange={(e) => setScale(parseFloat(e.target.value))} />} />
        <SmallRow label="Language" control={<Select size="md" options={langOptions} value={uiPrefs.language} onChange={(e) => setLang(e.target.value as typeof uiPrefs.language)} />} />
      </SettingsCard>

      <SettingsCard>
        <SectionLabel>About</SectionLabel>
        <div className="space-y-1">
          <CardTitle>Token Wand</CardTitle>
          <HelperText>Build accessible, scalable color systems for Figma.</HelperText>
        </div>
      </SettingsCard>
    </div>
  );
}

// ── Main overlay ─────────────────────────────────────────────────────────────

const SETTINGS_TABS: { value: SettingsTab; label: string }[] = [
  { value: "tokens", label: "Tokens" },
  { value: "roles", label: "Roles" },
  { value: "plugin", label: "Plugin" },
];

export function SettingsOverlay() {
  const isOpen = useUiStore((s) => s.activeOverlay === "settings");
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const settingsTab = useUiStore((s) => s.settingsTab);
  const setSettingsTab = useUiStore((s) => s.setSettingsTab);

  useEffect(() => {
    if (isOpen) takeSnapshot();
  }, [isOpen]);

  function handleCancel() {
    restoreSnapshot();
    closeOverlay();
  }

  function handleDone() {
    clearSnapshot();
    closeOverlay();
  }

  if (!isOpen) return null;

  return (
    <Modal open layer="base">
      <ModalHeader
        title="Settings"
        actions={
          <>
            <Button variant="secondary" size="md" label="Cancel" onClick={handleCancel} />
            <Button variant="primary" size="md" label="Done" onClick={handleDone} />
          </>
        }
      />

      <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-border-base overflow-x-auto">
        <TabBar tabs={SETTINGS_TABS} active={settingsTab} onChange={setSettingsTab} />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {settingsTab === "tokens" && <TokensTab />}
        {settingsTab === "roles" && <RolesTab />}
        {settingsTab === "plugin" && <PluginTab />}
      </div>
    </Modal>
  );
}
