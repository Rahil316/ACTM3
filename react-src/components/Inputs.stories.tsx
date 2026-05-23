import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from './Toggle';
import { SegmentedControl } from './SegmentedControl';
import { Select } from './Select';
import { Input } from './Input';
import { ColorInput } from './ColorInput';

const meta: Meta = {
  title: 'Components/Inputs',
  tags: ['autodocs'],
};
export default meta;

export const AllInputs: StoryObj = {
  render: () => {
    const [toggleOn, setToggleOn] = useState(false);
    const [segValue, setSegValue] = useState('scale');
    const [selectValue, setSelectValue] = useState('natural');
    const [inputValue, setInputValue] = useState('');
    const [colorValue, setColorValue] = useState('3B82F6');

    return (
      <div className="flex flex-col gap-6 p-4 max-w-sm bg-bg-app text-text-primary rounded-lg border border-border-base">
        <div>
          <label className="text-text-muted text-[12px] font-medium ml-1 block mb-1">Toggle Switch</label>
          <Toggle on={toggleOn} onChange={() => setToggleOn(!toggleOn)} />
        </div>

        <div>
          <label className="text-text-muted text-[12px] font-medium ml-1 block mb-1">Segmented Control</label>
          <SegmentedControl
            segments={[
              { value: 'scale', label: 'Scale Mode' },
              { value: 'direct', label: 'Direct Mode' },
            ]}
            value={segValue}
            onChange={setSegValue}
          />
        </div>

        <div>
          <Select
            label="Dropdown Selector"
            options={[
              { value: 'natural', label: 'Natural Scale' },
              { value: 'uniform', label: 'Uniform' },
              { value: 'expressive', label: 'Expressive' },
            ]}
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="Text Input"
            placeholder="Type something..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            hint="Helper text goes here"
          />
        </div>

        <div>
          <label className="text-text-muted text-[12px] font-medium ml-1 block mb-1">Color input picker</label>
          <ColorInput
            value={colorValue}
            onUpdate={setColorValue}
          />
          <div className="mt-1 text-[11px] text-text-muted ml-1">
            Active Hex Value: <span className="font-mono">#{colorValue}</span>
          </div>
        </div>
      </div>
    );
  }
};
