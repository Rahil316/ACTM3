import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from '../components/Toggle';
import { SegmentedControl } from '../components/SegmentedControl';
import { Select } from '../components/Select';
import { Input, Textarea } from '../components/Input';
import { ColorInput } from '../components/ColorInput';

const meta: Meta = {
  title: 'Components/Inputs',
  tags: ['autodocs'],
};
export default meta;

// ── Text input showcase ───────────────────────────────────────────────────────

export const TextInputs: StoryObj = {
  render: () => {
    const [v, setV] = useState('');
    return (
      <div className="flex flex-col gap-5 p-4 max-w-xs bg-bg-app rounded-lg border border-border-base">
        <Section label="Sizes">
          {(['table', 'sm', 'md', 'lg', 'xl'] as const).map((sz) => (
            <Input key={sz} size={sz} placeholder={sz} />
          ))}
        </Section>

        <Section label="States">
          <Input placeholder="Default"  inputState="default" hint="Helper text" />
          <Input placeholder="Error"    inputState="error"   hint="This field is required" />
          <Input placeholder="Warning"  inputState="warning" hint="Almost — double check this" />
          <Input placeholder="Success"  inputState="success" hint="Looks good!" />
        </Section>

        <Section label="With label + hint">
          <Input label="Email address" placeholder="you@example.com" hint="We'll never share your email." />
          <Input label="Token name" placeholder="primary-bg" inputState="error" hint="Name already taken." />
        </Section>

        <Section label="Icon slots">
          <Input
            label="Search"
            placeholder="Search tokens…"
            leadingIcon={<SearchIcon />}
          />
          <Input
            placeholder="Amount"
            trailingIcon={<span className="text-[10px] font-mono">px</span>}
          />
          <Input
            placeholder="Search with clear"
            leadingIcon={<SearchIcon />}
            trailingIcon={<X />}
          />
        </Section>

        <Section label="Monospace">
          <Input placeholder="FF5733" mono label="Hex value" />
        </Section>

        <Section label="Disabled">
          <Input placeholder="Can't touch this" disabled label="Disabled input" />
        </Section>

        <Section label="Controlled">
          <Input
            label="Controlled"
            value={v}
            onChange={(e) => setV(e.target.value)}
            hint={v.length > 0 ? `${v.length} chars` : 'Start typing…'}
          />
        </Section>
      </div>
    );
  },
};

// ── Textarea showcase ─────────────────────────────────────────────────────────

export const Textareas: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-5 p-4 max-w-xs bg-bg-app rounded-lg border border-border-base">
      <Section label="Default">
        <Textarea placeholder="Enter description…" />
      </Section>
      <Section label="With label + hint">
        <Textarea label="Notes" placeholder="Add notes about this token…" hint="Optional — shown in export." />
      </Section>
      <Section label="States">
        <Textarea placeholder="Error state" inputState="error" hint="Required." />
        <Textarea placeholder="Success state" inputState="success" hint="All good." />
      </Section>
      <Section label="Min rows">
        <Textarea label="Short (2 rows)" minRows={2} placeholder="Compact textarea" />
        <Textarea label="Tall (6 rows)"  minRows={6} placeholder="Taller textarea" />
      </Section>
      <Section label="Mono">
        <Textarea mono label="Raw CSS" placeholder="--color-primary: #3b82f6;" />
      </Section>
    </div>
  ),
};

// ── Other form controls ───────────────────────────────────────────────────────

export const OtherControls: StoryObj = {
  render: () => {
    const [toggleOn, setToggleOn]   = useState(false);
    const [segValue, setSegValue]   = useState('scale');
    const [selectValue, setSelect]  = useState('natural');
    const [colorValue, setColor]    = useState('3B82F6');

    return (
      <div className="flex flex-col gap-6 p-4 max-w-sm bg-bg-app rounded-lg border border-border-base">
        <Section label="Toggle">
          <Toggle on={toggleOn} onChange={() => setToggleOn(!toggleOn)} />
          <span className="text-text-muted text-[11px]">{toggleOn ? 'On' : 'Off'}</span>
        </Section>

        <Section label="Segmented control">
          <SegmentedControl
            segments={[
              { value: 'scale',  label: 'Scale Mode' },
              { value: 'direct', label: 'Direct Mode' },
            ]}
            value={segValue}
            onChange={setSegValue}
          />
        </Section>

        <Section label="Select">
          <Select
            label="Scale algorithm"
            options={[
              { value: 'natural',    label: 'Natural Scale' },
              { value: 'uniform',    label: 'Uniform' },
              { value: 'expressive', label: 'Expressive' },
            ]}
            value={selectValue}
            onChange={(e) => setSelect(e.target.value)}
          />
        </Section>

        <Section label="Color input">
          <ColorInput value={colorValue} onUpdate={setColor} />
          <span className="text-[11px] text-text-muted font-mono">#{colorValue}</span>
        </Section>
      </div>
    );
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold">{label}</p>
      {children}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function X() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}
