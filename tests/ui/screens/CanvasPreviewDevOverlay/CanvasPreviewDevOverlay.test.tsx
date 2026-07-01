import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasPreviewDevOverlay } from '../../../../src/ui/screens/CanvasPreviewDevOverlay';
import { useProjectStore, makeBootstrapState } from '../../../../src/ui/store/projectStore';
import { useEngineStore } from '../../../../src/ui/store/engineStore';

beforeEach(() => {
  useProjectStore.setState({ projectStore: makeBootstrapState() }, true);
  useEngineStore.setState({ result: { scales: {}, tokens: {}, errors: { critical: [], warnings: [], notices: [] } }, config: null, status: 'idle' }, true);
});

describe('CanvasPreviewDevOverlay', () => {
  it('renders without crashing given a bootstrapped store and empty engine result', () => {
    render(<CanvasPreviewDevOverlay />);
    expect(screen.getByText('Canvas Preview Dev')).toBeInTheDocument();
  });

  it('toggles to tree mode via ModeToggle', () => {
    render(<CanvasPreviewDevOverlay />);
    fireEvent.click(screen.getByText('Tree'));
    // Tree mode renders CanvasPreviewDevTree's toolbar filter input instead of the flat sections
    expect(screen.getByPlaceholderText(/filter color/i)).toBeInTheDocument();
  });
});
