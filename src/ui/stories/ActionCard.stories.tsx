import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ActionCard } from '../components/ActionCard';
import { SelectableCard } from '../components/SelectableCard';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

const meta: Meta<typeof ActionCard> = {
  component: ActionCard,
  title: 'Components/ActionCard',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ActionCard>;

export const Default: Story = {
  args: {
    title: 'v3 — Midnight Palette',
    subtitle: 'Last synced 2 hours ago',
    meta: '14 colors · 6 roles · 3 themes',
  },
};

export const WithActions: Story = {
  args: {
    title: 'v3 — Midnight Palette',
    subtitle: 'Last synced 2 hours ago',
    meta: '14 colors · 6 roles · 3 themes',
    actions: (
      <>
        <Button variant="ghost" size="xs" label="Restore" />
        <Button variant="danger" size="xs" label="Delete" />
      </>
    ),
  },
};

export const WithLeading: Story = {
  args: {
    title: 'CSS Variables',
    subtitle: 'Exports all scale and token variables as :root custom properties.',
    leading: <Badge variant="accent">CSS</Badge>,
    actions: <Button variant="primary" size="xs" label="Download" />,
  },
};

export const Clickable: Story = {
  args: {
    title: 'Open Project Settings',
    subtitle: 'Manage name, description, and version history.',
    onClick: () => alert('Card clicked'),
  },
};

export const LongTitle: Story = {
  args: {
    title: 'This is a very long title that should truncate gracefully without breaking the layout',
    subtitle: 'Subtitle stays visible below',
    meta: 'Meta text',
  },
};

export const InteractiveSelectableCard: StoryObj = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [selected, setSelected] = useState(false);
    return (
      <div className="max-w-sm">
        <SelectableCard selected={selected} onClick={() => setSelected(!selected)}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold text-text-primary">Sunrise Theme Preset</span>
            <Badge variant="success" size="xs" pill>Popular</Badge>
          </div>
          <p className="text-[11px] text-text-muted">
            A beautiful high-contrast warm palette designed for dashboards and creative sites.
          </p>
        </SelectableCard>
      </div>
    );
  },
};

