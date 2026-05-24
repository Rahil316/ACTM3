import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Spinner, SectionSpinner } from '../components/Spinner';
import { BannerSlot } from '../components/Banner';
import { ToastHub } from '../components/Toast';
import { useBannerStore } from '../store/bannerStore';
import { useToastStore } from '../store/toastStore';
import { LoadingOverlay, SuccessOverlay, ErrorOverlay, ValidationWarningOverlay } from '../components/ResultOverlay';
import { Button } from '../components/Button';

const meta: Meta = {
  title: 'Components/Feedback',
  tags: ['autodocs'],
};
export default meta;

export const Spinners: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-6 p-4 max-w-sm bg-bg-app rounded-lg border border-border-base">
      <div>
        <h4 className="text-text-muted text-[11px] uppercase tracking-wider mb-2 font-bold">Standard Spinners</h4>
        <div className="flex items-center gap-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </div>
      <div className="border-t border-border-base pt-4">
        <h4 className="text-text-muted text-[11px] uppercase tracking-wider mb-2 font-bold">Section Spinner</h4>
        <SectionSpinner message="Loading preview data..." />
      </div>
    </div>
  ),
};

export const BannersAndToasts: StoryObj = {
  render: () => {
    const bannersStore = useBannerStore();
    const toastsStore = useToastStore();

    const triggerWarningBanner = () => {
      bannersStore.show({
        id: `warning-${Date.now()}`,
        type: 'warning',
        title: 'Accessibility Warning',
        message: 'Some variations fail to meet WCAG AA contrast requirements.',
        detail: 'Primary/Text/Default (contrast: 2.1:1, target: 4.5:1)\nSecondary/Background/Active (contrast: 1.4:1, target: 3.0:1)',
        dismissable: true,
      });
    };

    const triggerSuccessBanner = () => {
      bannersStore.show({
        id: `success-${Date.now()}`,
        type: 'success',
        title: 'Sync Complete',
        message: 'Variables successfully synchronized to Figma.',
        dismissable: true,
      });
    };

    const triggerToast = (type: 'success' | 'error' | 'info' | 'warn' | 'neutral') => {
      toastsStore.show(`Toast message: Action completed (${type})`, { type });
    };

    return (
      <div className="flex flex-col gap-4 p-4 max-w-sm bg-bg-app rounded-lg border border-border-base relative overflow-hidden min-h-[300px]">
        <h4 className="text-text-muted text-[11px] uppercase tracking-wider mb-2 font-bold">Banners & Toasts Playbox</h4>
        
        {/* Banner container inside preview */}
        <BannerSlot className="border rounded border-border-base overflow-hidden" />

        <div className="flex flex-col gap-2 mt-4">
          <Button variant="secondary" size="sm" label="Trigger Warning Banner" onClick={triggerWarningBanner} />
          <Button variant="secondary" size="sm" label="Trigger Success Banner" onClick={triggerSuccessBanner} />
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <Button variant="primary" size="sm" label="Success Toast" onClick={() => triggerToast('success')} />
            <Button variant="danger" size="sm" label="Error Toast" onClick={() => triggerToast('error')} />
            <Button variant="secondary" size="sm" label="Warning Toast" onClick={() => triggerToast('warn')} />
            <Button variant="ghost" size="sm" label="Info Toast" onClick={() => triggerToast('info')} />
          </div>
        </div>

        {/* Local ToastHub rendering bottom-anchored */}
        <ToastHub />
      </div>
    );
  },
};

export const Overlays: StoryObj = {
  render: () => {
    const [activeOverlay, setActiveOverlay] = useState<'none' | 'loading' | 'success' | 'error' | 'warning'>('none');

    return (
      <div className="p-4 max-w-sm bg-bg-app rounded-lg border border-border-base relative min-h-[260px] flex flex-col gap-3 justify-center items-center">
        <h4 className="text-text-muted text-[11px] uppercase tracking-wider font-bold mb-2">Result Overlays</h4>
        
        <Button variant="secondary" size="md" className="w-full" label="Show Loading Overlay" onClick={() => setActiveOverlay('loading')} />
        <Button variant="secondary" size="md" className="w-full" label="Show Success Overlay" onClick={() => setActiveOverlay('success')} />
        <Button variant="secondary" size="md" className="w-full" label="Show Error Overlay" onClick={() => setActiveOverlay('error')} />
        <Button variant="secondary" size="md" className="w-full" label="Show Warning Overlay" onClick={() => setActiveOverlay('warning')} />

        <LoadingOverlay
          open={activeOverlay === 'loading'}
          title="Updating Variables"
          subtitle="Please wait while color engine builds Figma palette..."
        />

        <SuccessOverlay
          open={activeOverlay === 'success'}
          tally={{ created: 24, updated: 8, renamed: 2, failed: 0 }}
          onDismiss={() => setActiveOverlay('none')}
        />

        <ErrorOverlay
          open={activeOverlay === 'error'}
          message="Failed to connect to Figma API: permission denied."
          onDismiss={() => setActiveOverlay('none')}
        />

        <ValidationWarningOverlay
          open={activeOverlay === 'warning'}
          issues={[
            'Role "Primary/Text/Contrast" has no seed color source.',
            'Background "Neutral/900" is missing in dark theme config.',
            'Shorthand collision: "Burgundy" and "Bronze" both use prefix "b".'
          ]}
          onBack={() => setActiveOverlay('none')}
          onContinue={() => {
            alert('Continuing anyway...');
            setActiveOverlay('none');
          }}
        />
      </div>
    );
  },
};
