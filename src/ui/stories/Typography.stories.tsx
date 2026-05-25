import type { Meta, StoryObj } from '@storybook/react';
import { SectionLabel, Caption, FieldLabel, HelperText } from '../components/typography';
import { Button } from '../components/Button';
import * as Icons from '../components/icons';

const meta: Meta = {
  title: 'Components/Typography & Icons',
  tags: ['autodocs'],
};
export default meta;

export const TypographyElements: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4 p-4 max-w-sm bg-bg-app border border-border-base rounded-lg text-text-primary">
      <div>
        <SectionLabel>SECTION_LABEL</SectionLabel>
        <p className="text-[12px] text-text-muted">Used as an uppercase section divider label in settings panels.</p>
      </div>

      <hr className="border-border-base" />

      <div>
        <FieldLabel>FIELD_LABEL</FieldLabel>
        <p className="text-[12px] text-text-muted mt-1">Small uppercase tracking label used for card section dividers.</p>
      </div>

      <hr className="border-border-base" />

      <div>
        <p className="text-[13px] font-medium mb-1">Standard Body Text</p>
        <Caption className="mb-2">This is caption/hint text (11px, dim, leading-snug) for additional context.</Caption>
        <HelperText>This is helper/description text (11px, muted, leading-snug) for paragraphs and validation messages.</HelperText>
      </div>
    </div>
  ),
};

export const HeaderIconButtons: StoryObj = {
  render: () => (
    <div className="flex gap-2 p-4 max-w-sm bg-bg-app border border-border-base rounded-lg items-center">
      <Button variant="ghost" size="sm" square icon={<Icons.IconSettings />} aria-label="Settings" title="Settings" onClick={() => alert('Settings')} />
      <Button variant="ghost" size="sm" square icon={<Icons.IconRun />}      aria-label="Run"      title="Run Sync"  onClick={() => alert('Run')} />
      <Button variant="ghost" size="sm" square icon={<Icons.IconCode />}     aria-label="Export"   title="Export"   onClick={() => alert('Export')} />
    </div>
  ),
};

export const IconsGallery: StoryObj = {
  render: () => {
    // Filter and show all exports from components/icons.tsx
    const allIcons = Object.entries(Icons).filter(([name]) => name.startsWith('Icon'));

    return (
      <div className="p-4 max-w-md bg-bg-app border border-border-base rounded-lg text-text-primary">
        <h4 className="text-text-muted text-[11px] uppercase tracking-wider font-bold mb-4">Icons Registry ({allIcons.length})</h4>
        <div className="grid grid-cols-4 gap-4">
          {allIcons.map(([name, Comp]) => {
            const IconComp = Comp as React.ComponentType<{ className?: string }>;
            return (
              <div key={name} className="flex flex-col items-center justify-center p-2 rounded border border-border-base bg-bg-card hover:bg-bg-hover text-center" title={name}>
                <IconComp className="w-5 h-5 mb-1.5 text-text-muted" />
                <span className="text-[9px] text-text-dim select-all truncate w-full">{name.replace('Icon', '')}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};
