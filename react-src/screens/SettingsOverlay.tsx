import { useEffect } from 'react';
import { useAppStore, SCALE_ALGORITHM_OPTIONS, SOLVER_MODE_OPTIONS } from '../store/appStore';
import { useUiStore, VALID_SCALES, VALID_THEMES, VALID_LANGUAGES } from '../store/uiStore';
import { takeSnapshot, restoreSnapshot, clearSnapshot } from '../store/snapshots';
import { Modal, ModalHeader } from '../components/Modal';
import { TabBar } from '../components/TabBar';
import { SettingsCard, PanelRow, SmallRow } from '../components/SettingsCard';
import { Toggle } from '../components/Toggle';
import { Select } from '../components/Select';
import { SegmentedControl } from '../components/SegmentedControl';
import { Input } from '../components/Input';
import { Button, ActionButton } from '../components/Button';
import { ListRow, ListHeader } from '../components/ListRow';
import { ColorInput } from '../components/ColorInput';
import { SectionLabel } from '../components/typography';
import type { SettingsTab } from '../types/state';

// ── Tokens tab ───────────────────────────────────────────────────────────────

function TokensTab() {
  const appState     = useAppStore((s) => s.appState);
  const setAppField  = useAppStore((s) => s.setAppField);

  const pluginMode   = appState.pluginMode;
  const isScaleMode  = pluginMode === 'scale';

  const algoOptions = SCALE_ALGORITHM_OPTIONS.map((a) => ({ value: a, label: a }));
  const modeSegments = [
    { value: 'scale', label: 'Scale' },
    { value: 'direct', label: 'Direct' },
  ] as const;
  const scopeSegments = [
    { value: 'color', label: 'Per Color' },
    { value: 'role',  label: 'Per Role' },
  ] as const;
  const scaleStepNames   = useAppStore((s) => s.appState.scaleStepNames ?? []);
  const setScaleStepName = useAppStore((s) => s.setScaleStepName);
  const addScaleStepName = useAppStore((s) => s.addScaleStepName);
  const removeScaleStepName = useAppStore((s) => s.removeScaleStepName);

  return (
    <div className="flex flex-col gap-3">
      {/* Mode */}
      <SettingsCard>
        <SectionLabel>Plugin Mode</SectionLabel>
        <PanelRow
          label="Mode"
          description={isScaleMode ? 'Generate a full color scale from a seed color.' : 'Solve token values directly against themes.'}
          control={
            <SegmentedControl
              segments={modeSegments as unknown as { value: string; label: string }[]}
              value={pluginMode}
              onChange={(v) => setAppField('pluginMode', v as 'scale' | 'direct')}
            />
          }
        />
      </SettingsCard>

      {/* Scale settings */}
      {isScaleMode && (
        <SettingsCard>
          <SectionLabel>Scale</SectionLabel>
          <SmallRow
            label="Scale Length"
            control={
              <Input
                size="sm"
                type="number"
                value={String(appState.scaleLength)}
                min="5"
                max="100"
                step="1"
                width={null}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= 5 && v <= 100) setAppField('scaleLength', v);
                }}
              />
            }
          />
          <PanelRow
            label="Uniform Algorithm"
            description="Apply the same algorithm to all colors."
            control={
              <Toggle
                on={appState.useUniformAlgorithm}
                onChange={(v) => setAppField('useUniformAlgorithm', v)}
              />
            }
          />
          {appState.useUniformAlgorithm && (
            <SmallRow
              label="Algorithm"
              control={
                <Select
                  size="md"
                  options={algoOptions}
                  value={appState.scaleAlgorithm}
                  onChange={(e) => setAppField('scaleAlgorithm', e.target.value as typeof appState.scaleAlgorithm)}
                />
              }
            />
          )}
          {!appState.useUniformAlgorithm && (
            <SmallRow
              label="Algorithm Scope"
              control={
                <SegmentedControl
                  segments={scopeSegments as unknown as { value: string; label: string }[]}
                  value={appState.algorithmScopeLevel}
                  onChange={(v) => setAppField('algorithmScopeLevel', v as 'color' | 'role')}
                />
              }
            />
          )}
        </SettingsCard>
      )}

      {/* Direct mode solver */}
      {!isScaleMode && (
        <SettingsCard>
          <SectionLabel>Solver</SectionLabel>
          <PanelRow
            label="Uniform Solver"
            description="Apply the same solver to all colors."
            control={
              <Toggle
                on={appState.useUniformAlgorithm}
                onChange={(v) => setAppField('useUniformAlgorithm', v)}
              />
            }
          />
          {appState.useUniformAlgorithm && (
            <SmallRow
              label="Solver Mode"
              control={
                <Select
                  size="md"
                  options={SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }))}
                  value={appState.solverMode}
                  onChange={(e) => setAppField('solverMode', e.target.value as typeof appState.solverMode)}
                />
              }
            />
          )}
          {!appState.useUniformAlgorithm && (
            <SmallRow
              label="Solver Scope"
              control={
                <SegmentedControl
                  segments={scopeSegments as unknown as { value: string; label: string }[]}
                  value={appState.algorithmScopeLevel}
                  onChange={(v) => setAppField('algorithmScopeLevel', v as 'color' | 'role')}
                />
              }
            />
          )}
        </SettingsCard>
      )}

      {/* Token naming */}
      <SettingsCard>
        <SectionLabel>Token Naming</SectionLabel>
        <PanelRow
          label="Use Shorthand — Colors"
          control={<Toggle on={appState.useShorthandColors} onChange={(v) => setAppField('useShorthandColors', v)} />}
        />
        <PanelRow
          label="Use Shorthand — Roles"
          control={<Toggle on={appState.useShorthandRoles} onChange={(v) => setAppField('useShorthandRoles', v)} />}
        />
        <PanelRow
          label="Use Shorthand — Variations"
          control={<Toggle on={appState.useShorthandVariations} onChange={(v) => setAppField('useShorthandVariations', v)} />}
        />
        <PanelRow
          label="Use Shorthand — Steps"
          control={<Toggle on={appState.useShorthandSteps} onChange={(v) => setAppField('useShorthandSteps', v)} />}
        />
        <PanelRow
          label="Resolve Tokens Directly"
          description="Link role tokens to scale values without aliases."
          control={<Toggle on={appState.resolveTokensDirectly} onChange={(v) => setAppField('resolveTokensDirectly', v)} />}
        />
        <PanelRow
          label="Include Descriptions"
          control={<Toggle on={appState.includeDescriptions} onChange={(v) => setAppField('includeDescriptions', v)} />}
        />
      </SettingsCard>

      {/* Collections */}
      <SettingsCard>
        <SectionLabel>Collections</SectionLabel>
        <SmallRow
          label="Token Collection"
          control={
            <Input
              size="md"
              value={appState.tokenCollectionName}
              onChange={(e) => setAppField('tokenCollectionName', e.target.value)}
            />
          }
        />
        {isScaleMode && (
          <>
            <PanelRow
              label="Include Scale Collection"
              control={<Toggle on={appState.includeColorScalesCollection} onChange={(v) => setAppField('includeColorScalesCollection', v)} />}
            />
            {appState.includeColorScalesCollection && (
              <SmallRow
                label="Scale Collection Name"
                control={
                  <Input
                    size="md"
                    value={appState.scaleCollectionName}
                    onChange={(e) => setAppField('scaleCollectionName', e.target.value)}
                  />
                }
              />
            )}
          </>
        )}
        <PanelRow
          label="Include Source Colors"
          description="Creates a separate collection for seed hex values."
          control={<Toggle on={appState.includeSourceColors} onChange={(v) => setAppField('includeSourceColors', v)} />}
        />
        {appState.includeSourceColors && (
          <SmallRow
            label="Source Collection Name"
            control={
              <Input
                size="md"
                value={appState.sourceCollectionName}
                onChange={(e) => setAppField('sourceCollectionName', e.target.value)}
              />
            }
          />
        )}
        <PanelRow
          label="Include Alpha Tints"
          control={<Toggle on={appState.includeAlphaTints} onChange={(v) => setAppField('includeAlphaTints', v)} />}
        />
        {appState.includeAlphaTints && (
          <SmallRow
            label="Alpha Values"
            control={
              <Input
                size="lg"
                value={appState.alphaValues}
                placeholder="5, 10, 20, 50, 80"
                onChange={(e) => setAppField('alphaValues', e.target.value)}
              />
            }
          />
        )}
      </SettingsCard>

      {/* Step labels */}
      {isScaleMode && (
        <SettingsCard>
          <SectionLabel>Step Labels</SectionLabel>
          <p className="text-[11px] text-text-muted">Custom names for each step in the scale. Leave empty to use numbers.</p>
          {scaleStepNames.length > 0 && (
            <>
              <ListHeader columns={['Name', 'Short']} withDragHandle withRemoveButton />
              {scaleStepNames.map((step, i) => (
                <ListRow
                  key={i}
                  onRemove={() => removeScaleStepName(i)}
                  removeAriaLabel="Remove step label"
                >
                  <Input
                    size="sm"
                    value={step.name}
                    placeholder="Step name"
                    onChange={(e) => setScaleStepName(i, 'name', e.target.value)}
                  />
                  <Input
                    size="sm"
                    value={step.shorthand}
                    placeholder="Short"
                    onChange={(e) => setScaleStepName(i, 'shorthand', e.target.value)}
                  />
                </ListRow>
              ))}
            </>
          )}
          <ActionButton label="+ Add Step Label" onClick={addScaleStepName} />
        </SettingsCard>
      )}
    </div>
  );
}

// ── Roles tab ────────────────────────────────────────────────────────────────

function RolesTab() {
  const appState     = useAppStore((s) => s.appState);
  const setAppField  = useAppStore((s) => s.setAppField);
  const variations   = useAppStore((s) => s.appState.variations ?? []);
  const setVariation = useAppStore((s) => s.setVariation);
  const addVariation = useAppStore((s) => s.addVariation);
  const removeVariation = useAppStore((s) => s.removeVariation);

  const mappingSegments = [
    { value: 'contrast', label: 'Contrast' },
    { value: 'index',    label: 'Index' },
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      <SettingsCard>
        <SectionLabel>Role Defaults</SectionLabel>
        <SmallRow
          label="Default Mapping Method"
          control={
            <SegmentedControl
              segments={mappingSegments as unknown as { value: string; label: string }[]}
              value="contrast"
              onChange={() => {}}
            />
          }
        />
        <PanelRow
          label="Per-Role Variation Override"
          description="Allow each role to define its own variation list."
          control={
            <Toggle
              on={appState.perRoleVariationOverride}
              onChange={(v) => setAppField('perRoleVariationOverride', v)}
            />
          }
        />
      </SettingsCard>

      <SettingsCard>
        <SectionLabel>Shared Variations</SectionLabel>
        <p className="text-[11px] text-text-muted">Define the variation levels applied across all roles.</p>
        {variations.length > 0 && (
          <>
            <ListHeader columns={['Name', 'Short']} withDragHandle withRemoveButton />
            {variations.map((v, i) => (
              <ListRow
                key={v._id}
                onRemove={() => removeVariation(i)}
                removeDisabled={variations.length <= 1}
                removeAriaLabel="Remove variation"
              >
                <Input
                  size="sm"
                  value={v.name}
                  placeholder="Name"
                  onChange={(e) => setVariation(i, 'name', e.target.value)}
                />
                <Input
                  size="sm"
                  value={v.shorthand ?? ''}
                  placeholder="Short"
                  onChange={(e) => setVariation(i, 'shorthand', e.target.value)}
                />
              </ListRow>
            ))}
          </>
        )}
        <ActionButton label="+ Add Variation" onClick={addVariation} />
      </SettingsCard>
    </div>
  );
}

// ── Themes tab ───────────────────────────────────────────────────────────────

function ThemesTab() {
  const themes     = useAppStore((s) => s.appState.themes);
  const setTheme   = useAppStore((s) => s.setTheme);
  const addTheme   = useAppStore((s) => s.addTheme);
  const removeTheme = useAppStore((s) => s.removeTheme);

  return (
    <div className="flex flex-col gap-3">
      <SettingsCard>
        <SectionLabel>Themes</SectionLabel>
        <p className="text-[11px] text-text-muted">Each theme provides a background color for contrast calculation.</p>
        {themes.length > 0 && (
          <>
            <ListHeader columns={['Name', 'Background']} withRemoveButton />
            {themes.map((theme, i) => (
              <ListRow
                key={theme._id}
                onRemove={() => removeTheme(i)}
                removeDisabled={themes.length <= 1}
                removeAriaLabel="Remove theme"
              >
                <Input
                  size="sm"
                  value={theme.name}
                  placeholder="Theme name"
                  onChange={(e) => setTheme(i, 'name', e.target.value)}
                />
                <ColorInput
                  value={theme.bg}
                  onUpdate={(hex) => setTheme(i, 'bg', hex)}
                  idPrefix={`theme-${theme._id}`}
                  size="sm"
                />
              </ListRow>
            ))}
          </>
        )}
        <ActionButton label="+ Add Theme" onClick={addTheme} />
      </SettingsCard>
    </div>
  );
}

// ── Plugin tab ───────────────────────────────────────────────────────────────

function PluginTab() {
  const uiPrefs   = useUiStore((s) => s.uiPrefs);
  const setScale  = useUiStore((s) => s.setScale);
  const setTheme  = useUiStore((s) => s.setTheme);
  const setLang   = useUiStore((s) => s.setLanguage);

  const scaleOptions = VALID_SCALES.map((s) => ({ value: String(s), label: `${Math.round(s * 100)}%` }));
  const themeOptions = VALID_THEMES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
  const langOptions  = VALID_LANGUAGES.map((l) => ({
    value: l,
    label: l === 'en' ? 'English' : l === 'es' ? 'Español' : 'हिंदी',
  }));

  const uiThemeSegments = VALID_THEMES.map((t) => ({
    value: t,
    label: t.charAt(0).toUpperCase() + t.slice(1),
  }));

  return (
    <div className="flex flex-col gap-3">
      <SettingsCard>
        <SectionLabel>Appearance</SectionLabel>
        <SmallRow
          label="UI Theme"
          control={
            <SegmentedControl
              segments={uiThemeSegments}
              value={uiPrefs.theme}
              onChange={(v) => setTheme(v as typeof uiPrefs.theme)}
            />
          }
        />
        <SmallRow
          label="UI Scale"
          control={
            <Select
              size="md"
              options={scaleOptions}
              value={String(uiPrefs.scale)}
              onChange={(e) => setScale(parseFloat(e.target.value))}
            />
          }
        />
        <SmallRow
          label="Language"
          control={
            <Select
              size="md"
              options={langOptions}
              value={uiPrefs.language}
              onChange={(e) => setLang(e.target.value as typeof uiPrefs.language)}
            />
          }
        />
      </SettingsCard>

      <SettingsCard>
        <SectionLabel>Saved States</SectionLabel>
        <p className="text-[11px] text-text-muted">Version history coming soon.</p>
      </SettingsCard>

      <SettingsCard>
        <SectionLabel>Beta Features</SectionLabel>
        <p className="text-[11px] text-text-muted">No beta features available yet.</p>
      </SettingsCard>

      <SettingsCard>
        <SectionLabel>About</SectionLabel>
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-text-primary">Token Wand</p>
          <p className="text-[11px] text-text-muted">Build accessible, scalable color systems for Figma.</p>
        </div>
      </SettingsCard>
    </div>
  );
}

// ── Main overlay ─────────────────────────────────────────────────────────────

const SETTINGS_TABS: { value: SettingsTab; label: string }[] = [
  { value: 'tokens', label: 'Tokens' },
  { value: 'roles',  label: 'Roles' },
  { value: 'themes', label: 'Themes' },
  { value: 'plugin', label: 'Plugin' },
];

export function SettingsOverlay() {
  const isOpen        = useUiStore((s) => s.activeOverlay === 'settings');
  const closeOverlay  = useUiStore((s) => s.closeOverlay);
  const settingsTab   = useUiStore((s) => s.settingsTab);
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

      <div className="shrink-0 px-3 pb-2 border-b border-border-base">
        <TabBar
          tabs={SETTINGS_TABS}
          active={settingsTab}
          onChange={setSettingsTab}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {settingsTab === 'tokens' && <TokensTab />}
        {settingsTab === 'roles'  && <RolesTab />}
        {settingsTab === 'themes' && <ThemesTab />}
        {settingsTab === 'plugin' && <PluginTab />}
      </div>
    </Modal>
  );
}
