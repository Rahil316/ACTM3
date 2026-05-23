import type { Meta, StoryObj } from '@storybook/react';
import { Button, ActionButton } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  title: 'Components/Button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'icon', 'dashed', 'danger-solid'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    disabled: {
      control: 'boolean',
    },
    square: {
      control: 'boolean',
    },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    label: 'Primary Button',
    size: 'lg',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    label: 'Secondary Button',
    size: 'lg',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    label: 'Danger Button',
    size: 'lg',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    label: 'Ghost Button',
    size: 'lg',
  },
};

export const Dashed: Story = {
  args: {
    variant: 'dashed',
    label: 'Dashed Button',
    size: 'lg',
  },
};

export const AddActionButton: StoryObj<typeof ActionButton> = {
  render: (args) => <ActionButton {...args} />,
  args: {
    label: '+ Add Component',
    onClick: () => alert('Action Button Clicked'),
  },
};
