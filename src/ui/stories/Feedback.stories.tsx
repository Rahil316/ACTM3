import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Spinner, SectionSpinner } from '../components/Spinner';
import { BannerSlot } from '../components/Banner';
import { ToastHub } from '../components/Toast';
import { useBannerStore } from '../store/bannerStore';
import { useToastStore } from '../store/toastStore';
import { LoadingOverlay, SuccessOverlay, ErrorOverlay, ValidationWarningOverlay } from '../components/ResultOverlay';
import { Button } from '../components/Button';
import { Callout } from '../components/Callout';


const meta: Meta = {
  title: 'Components/Feedback',
  tags: ['autodocs'],
};
export default meta;

export const Spinners: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-6 p-4 max-w-sm bg-n-bg-app rounded-lg border border-n-br-default">
      <div>
        <h4 className="text-n-tx-muted text-[11px] uppercase tracking-wider mb-2 font-bold">Standard Spinners</h4>
        <div className="flex items-center gap-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </div>
      <div className="border-t border-n-br-default pt-4">
        <h4 className="text-n-tx-muted text-[11px] uppercase tracking-wider mb-2 font-bold">Section Spinner</h4>
        <SectionSpinner message="Loading preview data..." />
      </div>
    </div>
  ),
};

// Static showcase — all banner types visible immediately, no interaction needed.
export const Banners: StoryObj = {
  render: () => (
    <div className="flex flex-col w-full max-w-lg rounded-lg overflow-hidden border border-n-br-default">
      <BannerSlot />
    </div>
  ),
  decorators: [
    (Story) => {
      const store = useBannerStore();
      useEffect(() => {
        store.clear();
        store.show({ id: 'b-info',    type: 'info',    title: 'Update available', message: 'A new version of Token Wand is ready to install.' });
        store.show({ id: 'b-success', type: 'success', title: 'Sync complete',    message: '24 variables created, 8 updated, 2 renamed.' });
        store.show({ id: 'b-warning', type: 'warning', title: 'Contrast warning', message: 'Some variations fail WCAG AA.',
          detail: 'Primary/Text/Default (2.1:1, target 4.5:1)\nNeutral/BG/Active (1.4:1, target 3.0:1)', dismissable: true });
        store.show({ id: 'b-error',   type: 'error',   title: 'Sync failed',      message: 'Could not write variables — permission denied.',
          actions: [{ label: 'Retry', style: 'primary', onClick: () => {} }, { label: 'Dismiss', onClick: () => store.remove('b-error') }] });
        store.show({ id: 'b-autoclose', type: 'success', title: 'Auto-dismiss (5s)', message: 'This banner will slide away automatically.', autoClose: 5000 });
        store.show({ id: 'b-loading', type: 'loading', message: 'Syncing variables to Figma…', dismissable: false });
        store.show({ id: 'b-neutral', type: 'neutral', message: 'Direct mode active — scale generation is skipped.' });
        return () => store.clear();
      }, []);
      return <Story />;
    },
  ],
};

// Interactive playbox — trigger banners and toasts on demand.
export const BannersAndToasts: StoryObj = {
  render: () => {
    const bannersStore = useBannerStore();
    const toastsStore  = useToastStore();

    const add = (type: import('../store/bannerStore').BannerType) => {
      bannersStore.show({
        id: `${type}-${Date.now()}`,
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        message: `This is a ${type} banner — click × to dismiss.`,
        dismissable: type !== 'loading',
      });
    };

    const triggerToast = (type: 'success' | 'error' | 'info' | 'warn' | 'neutral') =>
      toastsStore.show(`Toast: ${type}`, { type });

    return (
      <div className="flex flex-col gap-4 max-w-lg">
        {/* Live banner output — sits above controls, not clipped */}
        <div className="rounded-lg overflow-hidden border border-n-br-default">
          <BannerSlot />
        </div>

        <div className="flex flex-col gap-2 p-3 bg-n-sf-default rounded-lg border border-n-br-default">
          <p className="text-n-tx-muted text-[11px] uppercase tracking-wider font-bold mb-1">Trigger banners</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(['info', 'success', 'warning', 'error', 'loading', 'neutral'] as const).map((t) => (
              <Button key={t} variant="secondary" size="sm" label={t} onClick={() => add(t)} />
            ))}
          </div>
          <Button variant="danger" size="sm" label="Clear all" onClick={() => bannersStore.clear()} />
        </div>

        <div className="flex flex-col gap-2 p-3 bg-n-sf-default rounded-lg border border-n-br-default">
          <p className="text-n-tx-muted text-[11px] uppercase tracking-wider font-bold mb-1">Trigger toasts</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(['success', 'error', 'warn', 'info', 'neutral'] as const).map((t) => (
              <Button key={t} variant="secondary" size="sm" label={t} onClick={() => triggerToast(t)} />
            ))}
          </div>
        </div>

        <ToastHub />
      </div>
    );
  },
};

export const Overlays: StoryObj = {
  render: () => {
    const [activeOverlay, setActiveOverlay] = useState<'none' | 'loading' | 'success' | 'error' | 'warning'>('none');

    return (
      <div className="p-4 max-w-sm bg-n-bg-app rounded-lg border border-n-br-default relative min-h-[260px] flex flex-col gap-3 justify-center items-center">
        <h4 className="text-n-tx-muted text-[11px] uppercase tracking-wider font-bold mb-2">Result Overlays</h4>

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
          tally={{ created: 24, updated: 8, renamed: 2, removed: 0, failed: 0 }}
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

export const Callouts: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3 p-4 bg-n-bg-app rounded-lg border border-n-br-default w-full max-w-md">
      <Callout variant="info" title="Information Callout">
        Make sure you are on a Figma Professional plan or higher to load multiple theme modes.
      </Callout>
      <Callout variant="success" title="Success Callout">
        Sync completed successfully! 24 variables were added to your collection.
      </Callout>
      <Callout variant="warning" title="Warning Callout">
        "Brand/Text/Secondary" fails WCAG AAA targets under "Dark Theme" mode.
      </Callout>
      <Callout variant="danger" title="Danger Callout">
        Authentication failed. Please log in to your Figma account and try again.
      </Callout>
    </div>
  ),
};
