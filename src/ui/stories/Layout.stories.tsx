import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ListRow, ListHeader } from '../components/ListRow';
import { SettingsCard, PanelRow, SmallRow } from '../components/SettingsCard';
import { Sheet } from '../components/Sheet';
import { TabBar } from '../components/TabBar';
import { Collapsible, SectionCollapsible } from '../components/Collapsible';
import { EmptyState } from '../components/EmptyState';
import { Input } from '../components/Input';
import { Toggle } from '../components/Toggle';
import { Button } from '../components/Button';
import { Backdrop } from '../components/Backdrop';
import { ScreenHeader } from '../components/ScreenHeader';

const meta: Meta = {
  title: 'Components/Layout',
  tags: ['autodocs'],
};
export default meta;

export const TabBars: StoryObj = {
  render: () => {
    const [activeTab, setActiveTab] = useState('first');
    return (
      <div className="p-4 max-w-sm bg-bg-app rounded-lg border border-border-base">
        <TabBar
          tabs={[
            { value: 'first', label: 'First Tab' },
            { value: 'second', label: 'Second Tab' },
            { value: 'third', label: 'Third Tab' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
        <div className="mt-4 text-text-muted text-[12px]">
          Active Content: Tab {activeTab}
        </div>
      </div>
    );
  },
};

export const Collapsibles: StoryObj = {
  render: () => {
    const [open1, setOpen1] = useState(false);
    const [open2, setOpen2] = useState(false);
    return (
      <div className="flex flex-col gap-4 p-4 max-w-sm bg-bg-app rounded-lg border border-border-base">
        <Collapsible
          open={open1}
          onToggle={() => setOpen1(!open1)}
          header={<span className="text-[12px] font-medium">Global Variable Settings</span>}
        >
          <div className="p-2 text-text-muted text-[12px]">
            Configure default scaling values, fallback behaviors, and target formats.
          </div>
        </Collapsible>
        <SectionCollapsible
          open={open2}
          onToggle={() => setOpen2(!open2)}
          label="Advanced Color Solver settings"
        >
          <div className="p-2 text-text-muted text-[12px]">
            Configure OKLCH binary-search precision and chroma-clamping heuristics.
          </div>
        </SectionCollapsible>
      </div>
    );
  },
};

export const SettingsCards: StoryObj = {
  render: () => {
    const [toggle, setToggle] = useState(false);
    return (
      <div className="p-4 max-w-sm bg-bg-app rounded-lg border border-border-base">
        <SettingsCard>
          <PanelRow
            label="Enable Alpha Tints"
            description="Generate opacity ramps from brand seed colors"
            control={<Toggle on={toggle} onChange={() => setToggle(!toggle)} />}
          />
          <hr className="border-border-base" />
          <SmallRow
            label="Active collection name"
            control={<span className="font-mono text-text-muted">_scale</span>}
          />
        </SettingsCard>
      </div>
    );
  },
};

export const EditableLists: StoryObj = {
  render: () => {
    const [items, setItems] = useState([
      { id: '1', name: 'Background' },
      { id: '2', name: 'Foreground' },
      { id: '3', name: 'Accent' },
    ]);

    const handleRemove = (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    };

    return (
      <div className="p-4 max-w-sm bg-bg-app rounded-lg border border-border-base space-y-2">
        <h4 className="text-text-muted text-[11px] uppercase tracking-wider font-bold mb-2">Editable List</h4>
        <ListHeader columns={['Name']} withDragHandle withRemoveButton />
        <div className="space-y-1">
          {items.map((item) => (
            <ListRow key={item.id} onRemove={() => handleRemove(item.id)} draggable>
              <Input size="sm" defaultValue={item.name} className="flex-1" />
            </ListRow>
          ))}
        </div>
        {items.length === 0 && (
          <EmptyState
            icon="📭"
            title="List is empty"
            description="You removed all components."
          />
        )}
      </div>
    );
  },
};

export const BottomSheet: StoryObj = {
  render: () => {
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
      <div className="p-4 max-w-sm bg-bg-app rounded-lg border border-border-base relative min-h-[300px] flex items-center justify-center">
        <Button variant="primary" label="Open Bottom Sheet" onClick={() => setSheetOpen(true)} />
        
        <Backdrop open={sheetOpen} onClick={() => setSheetOpen(false)} />
        <Sheet open={sheetOpen}>
          <div className="p-5 flex flex-col gap-3">
            <h3 className="text-[16px] font-bold text-text-primary">Theme Shop Presets</h3>
            <p className="text-text-muted text-[12px]">
              Browse other curated design palettes to build your design tokens instantly.
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" label="Cancel" onClick={() => setSheetOpen(false)} />
              <Button variant="primary" label="Close" onClick={() => setSheetOpen(false)} />
            </div>
          </div>
        </Sheet>
      </div>
    );
  },
};

export const ScreenHeaders: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4 p-4 bg-bg-app rounded-lg border border-border-base w-full max-w-md">
      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-2">Default Header</p>
        <ScreenHeader
          title="Color Scales"
          subtitle="Generate color groups and variables"
        />
      </div>
      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-2">With Actions</p>
        <ScreenHeader
          title="Figma Export"
          subtitle="Sync variables to your design file"
          actions={
            <>
              <Button variant="secondary" size="md" label="Preview" />
              <Button variant="primary" size="md" label="Export" />
            </>
          }
        />
      </div>
    </div>
  ),
};

