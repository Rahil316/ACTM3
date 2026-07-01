import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewScreen } from '../../../../src/ui/screens/PreviewScreen';
import { useProjectStore, makeBootstrapState } from '../../../../src/ui/store/projectStore';
import { useUiStore } from '../../../../src/ui/store/uiStore';
import { useEngineStore } from '../../../../src/ui/store/engineStore';

beforeEach(() => {
  useProjectStore.setState({ projectStore: makeBootstrapState() }, true);
  useUiStore.setState({ activeOverlay: 'preview' });
  useEngineStore.setState({ result: { scales: {}, tokens: {}, errors: { critical: [], warnings: [], notices: [] } }, config: null, status: 'idle' }, true);
});

describe('PreviewScreen', () => {
  it('renders nothing when the overlay is closed', () => {
    useUiStore.setState({ activeOverlay: null });
    render(<PreviewScreen />);
    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
  });

  it('renders tabs and switches between them', () => {
    render(<PreviewScreen />);
    const themeTabs = screen.getAllByRole('tab');
    expect(themeTabs.length).toBeGreaterThan(0);

    const secondTab = themeTabs[1];
    fireEvent.click(secondTab);
    expect(secondTab).toHaveAttribute('aria-selected', 'true');
  });
});
