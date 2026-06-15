import { type NameConflict } from '../types/messages';
import { SettingsCard } from './SettingsCard';
import { SegmentedControl } from './SegmentedControl';
import { SectionLabel, HelperText, MicroText } from './typography';

interface ConflictListProps {
  conflicts: NameConflict[];
  decisions: Record<string, 'keep' | 'revert'>;
  onChange: (ref: string, decision: 'keep' | 'revert') => void;
}

export function ConflictList({ conflicts, decisions, onChange }: ConflictListProps) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <SettingsCard>
      <SectionLabel className="text-w-tx-muted">Manual Renames Detected</SectionLabel>
      <HelperText className="mb-3">
        Some variables have been renamed manually in Figma. Choose whether to keep the Figma names or revert to the design system suggested format.
      </HelperText>
      <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
        {conflicts.map((conflict) => (
          <div
            key={conflict.tokenRef}
            className="flex flex-col gap-1.5 p-2.5 border border-n-br-subtle rounded-md bg-n-sf-sunken"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="font-mono text-[11px] text-n-tx-secondary truncate max-w-[220px]"
                title={conflict.figmaName}
              >
                Figma: {conflict.figmaName}
              </span>
              <SegmentedControl
                segments={[
                  { value: 'keep', label: 'Keep Figma' },
                  { value: 'revert', label: 'Overwrite' },
                ]}
                value={decisions[conflict.tokenRef] || 'keep'}
                onChange={(v) => onChange(conflict.tokenRef, v as 'keep' | 'revert')}
              />
            </div>
            <MicroText className="text-n-tx-muted">
              Suggested: {conflict.suggestedName}
            </MicroText>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}
