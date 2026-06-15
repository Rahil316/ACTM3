import type { Meta, StoryObj } from '@storybook/react';
import { ColorSwatch } from '../components/ColorSwatch';

const meta: Meta<typeof ColorSwatch> = {
  component: ColorSwatch,
  title: 'Components/ColorSwatch',
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'color',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    radius: {
      control: 'select',
      options: ['sm', 'md', 'full'],
    },
    border: {
      control: 'boolean',
    },
  },
};
export default meta;

type Story = StoryObj<typeof ColorSwatch>;

export const Default: Story = {
  args: {
    color: '#0066FF',
    size: 'md',
    radius: 'md',
    border: true,
  },
};

export const LargeCircle: Story = {
  args: {
    color: '#8B5CF6',
    size: 'lg',
    radius: 'full',
    border: true,
  },
};

export const SmallSquare: Story = {
  args: {
    color: '#EF4444',
    size: 'sm',
    radius: 'sm',
    border: true,
  },
};

export const WithoutBorder: Story = {
  args: {
    color: '#10B981',
    size: 'md',
    radius: 'md',
    border: false,
  },
};

export const Showcase: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4 p-4 bg-n-bg-app rounded-lg border border-n-br-default max-w-xs">
      <div>
        <p className="text-n-tx-muted text-[10px] uppercase tracking-wider font-bold mb-2">Sizes</p>
        <div className="flex items-center gap-3">
          <ColorSwatch color="#0066FF" size="xs" />
          <ColorSwatch color="#0066FF" size="sm" />
          <ColorSwatch color="#0066FF" size="md" />
          <ColorSwatch color="#0066FF" size="lg" />
        </div>
      </div>
      <div className="border-t border-n-br-default pt-3">
        <p className="text-n-tx-muted text-[10px] uppercase tracking-wider font-bold mb-2">Corners</p>
        <div className="flex items-center gap-3">
          <ColorSwatch color="#8B5CF6" size="md" radius="sm" />
          <ColorSwatch color="#8B5CF6" size="md" radius="md" />
          <ColorSwatch color="#8B5CF6" size="md" radius="full" />
        </div>
      </div>
    </div>
  ),
};
