import type { Meta, StoryObj } from '@storybook/react';
import { ActionCard } from '../components/ActionCard';
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
