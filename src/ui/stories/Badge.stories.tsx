import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/Badge';

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: 'Components/Badge',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'accent', 'success', 'warning', 'danger', 'muted', 'outline'] },
    size:    { control: 'select', options: ['xs', 'sm', 'md'] },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

// ── Playground ────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: { children: 'Badge', variant: 'default', size: 'sm' },
};

// ── All variants ──────────────────────────────────────────────────────────────

export const Variants: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-6 p-4 bg-bg-app rounded-lg border border-border-base">
      <Section label="Variants">
        {(['default', 'accent', 'success', 'warning', 'danger', 'muted', 'outline'] as const).map((v) => (
          <Badge key={v} variant={v}>{v}</Badge>
        ))}
      </Section>

      <Section label="Sizes">
        <Badge size="xs">xs</Badge>
        <Badge size="sm">sm</Badge>
        <Badge size="md">md</Badge>
      </Section>

      <Section label="Pill shape">
        {(['default', 'accent', 'success', 'warning', 'danger'] as const).map((v) => (
          <Badge key={v} variant={v} pill>{v}</Badge>
        ))}
      </Section>

      <Section label="With status dot">
        <Badge variant="success" dot>Online</Badge>
        <Badge variant="warning" dot>Degraded</Badge>
        <Badge variant="danger"  dot>Offline</Badge>
        <Badge variant="muted"   dot>Idle</Badge>
      </Section>

      <Section label="With icons">
        <Badge variant="accent"  leftIcon={<Star />}>Featured</Badge>
        <Badge variant="success" rightIcon={<Check />}>Verified</Badge>
        <Badge variant="danger"  leftIcon={<X />} rightIcon={<X />}>Error</Badge>
      </Section>

      <Section label="Dismissible tags">
        <DismissibleDemo />
      </Section>

      <Section label="Clickable">
        <Badge variant="outline" onClick={() => alert('clicked')}>Click me</Badge>
        <Badge variant="accent"  onClick={() => alert('clicked')} pill>Pill button</Badge>
      </Section>

      <Section label="Disabled">
        <Badge variant="accent"   disabled>Disabled</Badge>
        <Badge variant="danger"   disabled>Disabled</Badge>
      </Section>

      <Section label="All sizes × all variants">
        {(['xs', 'sm', 'md'] as const).map((sz) => (
          <div key={sz} className="flex items-center gap-1.5 flex-wrap">
            {(['default', 'accent', 'success', 'warning', 'danger', 'muted', 'outline'] as const).map((v) => (
              <Badge key={v} variant={v} size={sz}>{sz}</Badge>
            ))}
          </div>
        ))}
      </Section>
    </div>
  ),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-2">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

function DismissibleDemo() {
  const initial = ['React', 'TypeScript', 'Figma', 'Design System', 'Tokens'];
  const [tags, setTags] = useState(initial);
  if (tags.length === 0) return (
    <button className="text-[11px] text-accent underline" onClick={() => setTags(initial)}>Reset</button>
  );
  return (
    <>
      {tags.map((t) => (
        <Badge key={t} variant="accent" onRemove={() => setTags((prev) => prev.filter((x) => x !== t))}>{t}</Badge>
      ))}
    </>
  );
}

function Star() {
  return <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.9 4h4.1l-3.3 2.5 1.3 4L8 9 4 11.5l1.3-4L2 5h4.1z"/></svg>;
}
function Check() {
  return <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8l3.5 3.5L13 4.5"/></svg>;
}
function X() {
  return <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>;
}
