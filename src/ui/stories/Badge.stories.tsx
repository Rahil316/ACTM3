import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/Badge';

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: 'Components/Badge',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'accent', 'danger', 'muted'],
    },
    disabled: {
      control: 'boolean',
    },
    onClick: { action: 'clicked' },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Default Badge',
    variant: 'default',
  },
};

export const Accent: Story = {
  args: {
    children: 'Accent Badge',
    variant: 'accent',
  },
};

export const Danger: Story = {
  args: {
    children: 'Danger Badge',
    variant: 'danger',
  },
};

export const Muted: Story = {
  args: {
    children: 'Muted Badge',
    variant: 'muted',
  },
};

export const Clickable: Story = {
  args: {
    children: 'Click Me',
    variant: 'accent',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Badge',
    variant: 'default',
    disabled: true,
  },
};
