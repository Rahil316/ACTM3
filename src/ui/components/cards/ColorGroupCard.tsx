import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import { Input } from '../Input';
import { ColorInput } from '../ColorInput';
import { Button } from '../Button';
import { Select } from '../Select';
import { IconTrash } from '../icons';
import type { Color } from '../../types/state';
import { SCALE_ALGORITHM_OPTIONS, SOLVER_MODE_OPTIONS } from '../../store/appStore';

interface ColorGroupCardProps {
  color: Color;
  idx: number;
}

export function ColorGroupCard({ color, idx }: ColorGroupCardProps) {
  const setColor     = useAppStore((s) => s.setColor);
  const removeColor  = useAppStore((s) => s.removeColor);
  const colorCount         = useAppStore((s) => s.appState.colors.length);
  const pluginMode         = useAppStore((s) => s.appState.pluginMode);
  const useUniformAlgo     = useAppStore((s) => s.appState.useUniformAlgorithm);
  const algoScope          = useAppStore((s) => s.appState.algorithmScopeLevel);
  const useShorthandColors = useAppStore((s) => s.appState.useShorthandColors);
  const includeDescriptions = useAppStore((s) => s.appState.includeDescriptions);
  const colorDragSrcIdx    = useUiStore((s) => s.colorDragSrcIdx);
  const setDragSrc         = useUiStore((s) => s.setColorDragSrcIdx);
  const moveColor          = useAppStore((s) => s.moveColor);

  // ── Conditional row visibility (mirrors vanilla Components._Color*Row) ──
  // Algorithm selector: scale mode, not uniform, scope is 'color'
  const showAlgoRow =
    pluginMode === 'scale' && !useUniformAlgo && algoScope !== 'role';
  // Solver mode: direct mode, not uniform, scope is 'color'
  const showSolverRow =
    pluginMode === 'direct' && !useUniformAlgo && algoScope !== 'role';

  const algoOptions = SCALE_ALGORITHM_OPTIONS.map((a) => ({ value: a, label: a }));
  const solverOptions = SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }));

  return (
    <div
      draggable
      onDragStart={() => setDragSrc(idx)}
      onDragEnd={() => setDragSrc(null)}
      onDragOver={(e) => {
        if (colorDragSrcIdx === null || colorDragSrcIdx === idx) return;
        e.preventDefault();
      }}
      onDrop={() => {
        if (colorDragSrcIdx !== null && colorDragSrcIdx !== idx) {
          moveColor(colorDragSrcIdx, idx);
          setDragSrc(null);
        }
      }}
      className="bg-bg-card rounded-[12px] border border-border-base p-3 space-y-2"
    >
      {/* Main row: name / shorthand / color value / delete */}
      <div className="grid gap-2 items-end" style={{ gridTemplateColumns: useShorthandColors ? '1fr 72px 108px 36px' : '1fr 108px 36px' }}>
        <Input
          id={`clr-${color._id}-name`}
          value={color.name}
          onChange={(e) => setColor(idx, 'name', e.target.value)}
          label="Color Name"
          size="xl"
        />
        {useShorthandColors && (
          <Input
            id={`clr-${color._id}-short`}
            value={color.shorthand ?? ''}
            onChange={(e) => setColor(idx, 'shorthand', e.target.value)}
            label="Shorthand"
            size="xl"
          />
        )}
        <div className="space-y-1">
          <p className="text-text-muted text-[12px] font-medium ml-1">Value</p>
          <ColorInput
            value={color.value}
            onUpdate={(hex) => setColor(idx, 'value', hex)}
            idPrefix={`clr-${color._id}`}
            size="xl"
          />
        </div>
        <div className="self-end">
          <Button
            variant="danger"
            size="md"
            square
            icon={<IconTrash />}
            onClick={() => removeColor(idx)}
            disabled={colorCount <= 1}
            aria-label="Delete color"
          />
        </div>
      </div>

      {/* Scale algorithm row */}
      {showAlgoRow && (
        <Select
          label="Scale Algorithm"
          size="lg"
          options={algoOptions}
          value={color.scaleAlgorithm ?? 'Natural'}
          onChange={(e) => setColor(idx, 'scaleAlgorithm', e.target.value)}
        />
      )}

      {/* Solver mode row */}
      {showSolverRow && (
        <Select
          label="Color Solver"
          size="xl"
          options={solverOptions}
          value={color.solverMode ?? 'natural'}
          onChange={(e) => setColor(idx, 'solverMode', e.target.value)}
        />
      )}

      {/* Description row */}
      {includeDescriptions && (
        <Input
          value={color.description ?? ''}
          placeholder="Optional…"
          onChange={(e) => setColor(idx, 'description', e.target.value)}
          label="Description"
          size="lg"
        />
      )}
    </div>
  );
}
