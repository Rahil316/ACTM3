import type { Meta, StoryObj } from '@storybook/react';
import { ColorGroupCard } from './ColorGroupCard';
import { RoleGroupCard } from './RoleGroupCard';
import { useAppStore } from '../../store/appStore';

const meta: Meta = {
  title: 'Components/Cards',
  tags: ['autodocs'],
};
export default meta;

export const ColorCard: StoryObj = {
  render: () => {
    const color = useAppStore((s) => s.appState.colors[0]);
    if (!color) return <div className="text-text-muted text-[12px]">No color available in store.</div>;
    return (
      <div className="p-4 max-w-sm bg-bg-app border border-border-base rounded-lg">
        <ColorGroupCard color={color} idx={0} />
      </div>
    );
  }
};

export const RoleCard: StoryObj = {
  render: () => {
    const role = useAppStore((s) => s.appState.roles[0]);
    if (!role) return <div className="text-text-muted text-[12px]">No role available in store.</div>;
    return (
      <div className="p-4 max-w-sm bg-bg-app border border-border-base rounded-lg">
        <RoleGroupCard role={role} idx={0} />
      </div>
    );
  }
};
