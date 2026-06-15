import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MenuHeader, MenuRow, SuggestSheet } from '../components/MenuSheet';
import { ColorSwatch } from '../components/ColorSwatch';
import { Button } from '../components/Button';

const meta: Meta = {
  title: 'Components/MenuSheet',
  tags: ['autodocs'],
};
export default meta;

export const Header: StoryObj<typeof MenuHeader> = {
  render: (args) => (
    <div className="max-w-sm border border-n-br-default rounded-lg bg-n-sf-default overflow-hidden">
      <MenuHeader {...args} />
    </div>
  ),
  args: {
    label: 'Select color',
    onClose: () => alert('Close clicked'),
  },
};

export const HeaderWithLink: StoryObj<typeof MenuHeader> = {
  render: (args) => (
    <div className="max-w-sm border border-n-br-default rounded-lg bg-n-sf-default overflow-hidden">
      <MenuHeader {...args} />
    </div>
  ),
  args: {
    label: 'Suggested Roles',
    action: <Button variant="underlined" size="xs" label="+ Custom" onClick={() => alert('Custom clicked')} />,
  },
};

export const Row: StoryObj<typeof MenuRow> = {
  render: (args) => (
    <div className="max-w-sm border border-n-br-default rounded-lg bg-n-sf-default overflow-hidden">
      <MenuRow {...args}>
        <ColorSwatch color="#0066FF" size="sm" />
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-semibold text-n-tx-primary">Brand/Primary</span>
          <span className="text-[10px] text-n-tx-muted">Primary Brand Color · #0066FF</span>
        </div>
      </MenuRow>
    </div>
  ),
  args: {
    onClick: () => alert('Row clicked'),
  },
};

export const InteractiveSuggestSheet: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div className="p-4 max-w-sm border border-n-br-default rounded-lg bg-n-bg-app relative min-h-[300px] flex items-center justify-center">
        <Button variant="primary" label="Open Suggest Sheet" onClick={() => setOpen(true)} />

        {open && (
          <SuggestSheet
            label="Suggested Colors"
            linkLabel="+ Custom"
            onLink={() => {
              alert('Custom link clicked');
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          >
            <MenuRow onClick={() => { alert('Selected Crimson'); setOpen(false); }}>
              <ColorSwatch color="#DC2626" size="sm" />
              <span className="text-[12px] text-n-tx-primary font-medium">Crimson</span>
            </MenuRow>
            <MenuRow onClick={() => { alert('Selected Emerald'); setOpen(false); }}>
              <ColorSwatch color="#059669" size="sm" />
              <span className="text-[12px] text-n-tx-primary font-medium">Emerald</span>
            </MenuRow>
            <MenuRow onClick={() => { alert('Selected Indigo'); setOpen(false); }}>
              <ColorSwatch color="#4F46E5" size="sm" />
              <span className="text-[12px] text-n-tx-primary font-medium">Indigo</span>
            </MenuRow>
          </SuggestSheet>
        )}
      </div>
    );
  },
};
