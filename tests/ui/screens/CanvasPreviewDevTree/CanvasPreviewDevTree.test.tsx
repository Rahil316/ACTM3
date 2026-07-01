import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasPreviewDevTree } from '../../../../src/ui/screens/CanvasPreviewDevTree';
import { makeBootstrapState } from '../../../../src/ui/store/projectStore';

describe('CanvasPreviewDevTree', () => {
  it('renders the toolbar and config tree given an empty engine result', () => {
    const projectStore = makeBootstrapState();
    const result = { scales: {}, tokens: {}, errors: { critical: [], warnings: [], notices: [] } };

    render(<CanvasPreviewDevTree projectStore={projectStore} config={projectStore} result={result} />);

    expect(screen.getByPlaceholderText(/filter color/i)).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getByText(/no errors, warnings or notices/i)).toBeInTheDocument();
  });

  it('filters colors via the search input', () => {
    const projectStore = makeBootstrapState();
    const [color0] = projectStore.colors;
    const [theme0] = projectStore.themes;
    const result = {
      scales: {},
      errors: { critical: [], warnings: [], notices: [] },
      tokens: {
        [theme0.name.toLowerCase()]: {
          [color0.name]: {
            0: { 0: { value: '#112233', contrast: { ratio: 4.5, rating: 'AA' } } },
          },
        },
      },
    };

    render(<CanvasPreviewDevTree projectStore={projectStore} config={projectStore} result={result} />);

    const input = screen.getByPlaceholderText(/filter color/i);
    fireEvent.change(input, { target: { value: 'zzz-no-match' } });
    // Tokens root row still renders (unfiltered), but no theme rows since color filter excludes everything.
    expect(screen.getByText('Tokens')).toBeInTheDocument();
  });
});
