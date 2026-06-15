import type { Meta, StoryObj } from '@storybook/react';
import {
  SectionLabel, FieldLabel,
  ModalTitle, SheetTitle,
  CardTitle, Subtitle,
  Caption, HelperText, MicroText,
  StatValue, Mono,
} from '../components/typography';
import { Button } from '../components/Button';
import * as Icons from '../components/icons';

const meta: Meta = {
  title: 'Components/Typography & Icons',
  tags: ['autodocs'],
};
export default meta;

// ── Type scale showcase ───────────────────────────────────────────────────────

export const TypeScale: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-5 p-4 max-w-sm bg-n-bg-app border border-n-br-default rounded-lg">

      <Row label="ModalTitle" usage="Full-screen result overlays (success, error)">
        <ModalTitle>Success!</ModalTitle>
      </Row>

      <Row label="SheetTitle" usage="Validation warnings, modal sub-headings">
        <SheetTitle>3 issues found</SheetTitle>
      </Row>

      <Row label="CardTitle" usage="Card headers, list item primary text, collapsible labels">
        <CardTitle>Neutral / Background</CardTitle>
      </Row>

      <Row label="Subtitle" usage="Secondary label beneath a card title, role names">
        <Subtitle>Subtle · Muted · Strong</Subtitle>
      </Row>

      <Row label="SectionLabel" usage="Uppercase divider inside settings panels">
        <SectionLabel>Token Naming</SectionLabel>
      </Row>

      <Row label="FieldLabel" usage="Form group headers, heavier variant of SectionLabel">
        <FieldLabel>Scale Algorithm</FieldLabel>
      </Row>

      <Row label="HelperText" usage="Settings descriptions, empty state body, form hints">
        <HelperText>Pre-built design system configurations. Loading a preset replaces your current setup.</HelperText>
      </Row>

      <Row label="Caption" usage="Dim 11px — input hints, tooltip sub-lines">
        <Caption>We'll never share your email with anyone else.</Caption>
      </Row>

      <Row label="MicroText" usage="Timestamps, word counts, secondary metadata">
        <MicroText>2 days ago · 3 min read</MicroText>
      </Row>

      <Row label="StatValue" usage="Bold numeric values in summary rows">
        <StatValue>42</StatValue>
      </Row>

      <Row label="Mono" usage="Hex values, token paths, CSS variable names">
        <Mono>--color-primary-500</Mono>
      </Row>

    </div>
  ),
};

// ── Icon button showcase ──────────────────────────────────────────────────────

export const IconButtons: StoryObj = {
  render: () => (
    <div className="flex gap-2 p-4 bg-n-bg-app border border-n-br-default rounded-lg items-center">
      <Button variant="ghost" size="sm" square icon={<Icons.IconSettings />} aria-label="Settings" title="Settings" onClick={() => alert('Settings')} />
      <Button variant="ghost" size="sm" square icon={<Icons.IconRun />}      aria-label="Run"      title="Run"      onClick={() => alert('Run')} />
      <Button variant="ghost" size="sm" square icon={<Icons.IconCode />}     aria-label="Export"   title="Export"   onClick={() => alert('Export')} />
      <Button variant="ghost" size="sm" square icon={<Icons.IconImport />}   aria-label="Import"   title="Import"   onClick={() => alert('Import')} />
      <Button variant="ghost" size="sm" square icon={<Icons.IconReset />}    aria-label="Reset"    title="Reset"    onClick={() => alert('Reset')} />
    </div>
  ),
};

// ── Icons gallery ─────────────────────────────────────────────────────────────

export const IconsGallery: StoryObj = {
  render: () => {
    const allIcons = Object.entries(Icons).filter(([name]) => name.startsWith('Icon'));
    return (
      <div className="p-4 max-w-md bg-n-bg-app border border-n-br-default rounded-lg text-n-tx-primary">
        <SectionLabel>Icons Registry ({allIcons.length})</SectionLabel>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {allIcons.map(([name, Comp]) => {
            const IconComp = Comp as React.ComponentType<{ className?: string }>;
            return (
              <div key={name} className="flex flex-col items-center justify-center p-2 rounded border border-n-br-default bg-n-sf-default hover:bg-n-sf-hover text-center" title={name}>
                <IconComp className="w-5 h-5 mb-1.5 text-n-tx-muted" />
                <MicroText className="select-all truncate w-full text-center">{name.replace('Icon', '')}</MicroText>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};

// ── Helper ────────────────────────────────────────────────────────────────────

function Row({ label, usage, children }: { label: string; usage: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-n-br-subtle pb-4 last:border-0 last:pb-0">
      <div className="flex items-baseline gap-2 mb-0.5">
        <span className="text-[10px] font-mono text-b-tx-muted">{label}</span>
        <span className="text-[10px] text-n-tx-dim">{usage}</span>
      </div>
      {children}
    </div>
  );
}
