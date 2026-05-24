import type { Meta, StoryObj } from '@storybook/react';
import { ColorGroupCard } from '../../components/cards/ColorGroupCard';
import { RoleGroupCard } from '../../components/cards/RoleGroupCard';
import { useAppStore } from '../../store/appStore';

const meta: Meta = {
  title: 'Components/Cards',
  tags: ['autodocs'],
};
export default meta;

function ColorCardStory() {
  const color = useAppStore((s: ReturnType<typeof useAppStore.getState>) => s.appState.colors[0]);
  if (!color) return <div className="text-text-muted text-[12px]">No color available in store.</div>;
  return (
    <div className="p-4 max-w-sm bg-bg-app border border-border-base rounded-lg">
      <ColorGroupCard color={color} idx={0} />
    </div>
  );
}

function RoleCardStory() {
  const role = useAppStore((s: ReturnType<typeof useAppStore.getState>) => s.appState.roles[0]);
  if (!role) return <div className="text-text-muted text-[12px]">No role available in store.</div>;
  return (
    <div className="p-4 max-w-sm bg-bg-app border border-border-base rounded-lg">
      <RoleGroupCard role={role} idx={0} />
    </div>
  );
}

export const ColorCard: StoryObj = { render: () => <ColorCardStory /> };
export const RoleCard: StoryObj = { render: () => <RoleCardStory /> };
