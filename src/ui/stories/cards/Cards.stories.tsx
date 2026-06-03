import type { Meta, StoryObj } from "@storybook/react";
import { ColorGroupCard } from "../../components/cards/ColorGroupCard";
import { RoleGroupCard } from "../../components/cards/RoleGroupCard";
import { CardToolbar } from "../../components/CardToolbar";
import { useProjectStore } from "../../store/projectStore";
import { Button } from "../../components/Button";
import { Settings } from "lucide-react";

const meta: Meta = {
  title: "Components/Cards",
  tags: ["autodocs"],
};
export default meta;

function ColorCardStory() {
  const color = useProjectStore((s: ReturnType<typeof useProjectStore.getState>) => s.projectStore.colors[0]);
  if (!color) return <div className="text-text-muted text-[12px]">No color available in store.</div>;
  return (
    <div className="p-4 max-w-sm bg-bg-app border border-border-base rounded-lg">
      <ColorGroupCard color={color} idx={0} />
    </div>
  );
}

function RoleCardStory() {
  const role = useProjectStore((s: ReturnType<typeof useProjectStore.getState>) => s.projectStore.roles[0]);
  if (!role) return <div className="text-text-muted text-[12px]">No role available in store.</div>;
  return (
    <div className="p-4 max-w-sm bg-bg-app border border-border-base rounded-lg">
      <RoleGroupCard role={role} idx={0} />
    </div>
  );
}

export const ColorCard: StoryObj = { render: () => <ColorCardStory /> };
export const RoleCard: StoryObj = { render: () => <RoleCardStory /> };

export const Toolbar: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-6 p-4 bg-bg-app rounded-lg border border-border-base max-w-md">
      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-2">Card Hover Container (Hover to reveal toolbar)</p>
        <div className="group/card relative w-64 h-24 border border-border-base bg-bg-card rounded-[12px] flex items-center justify-center transition-colors hover:border-border-strong">
          <span className="text-text-muted text-[11px]">Hover over me</span>
          <CardToolbar onDelete={() => alert("Delete action triggered")} deleteTitle="Delete Card" />
        </div>
      </div>

      <div className="border-t border-border-base pt-4">
        <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-2">Toolbar with Custom Slot Actions (Hover to reveal)</p>
        <div className="group/card relative w-64 h-24 border border-border-base bg-bg-card rounded-[12px] flex items-center justify-center transition-colors hover:border-border-strong">
          <span className="text-text-muted text-[11px]">Hover over me</span>
          <CardToolbar onDelete={() => alert("Delete action triggered")} deleteTitle="Delete Card" dragListeners={{}} dragAttributes={{}}>
            <Button variant="icon" size="sm" onClick={() => alert("Settings clicked")} title="Card Settings" icon={<Settings size={11} strokeWidth={1.75} />} />
          </CardToolbar>
        </div>
      </div>
    </div>
  ),
};
