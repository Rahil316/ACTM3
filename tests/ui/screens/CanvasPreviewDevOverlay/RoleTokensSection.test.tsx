import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleTokensSection } from '../../../../src/ui/screens/CanvasPreviewDevOverlay/RoleTokensSection';
import { makeBootstrapState } from '../../../../src/ui/store/projectStore';

describe('RoleTokensSection', () => {
  it('renders a token tile for each theme/color/role/variation entry present in the engine result', () => {
    const projectStore = makeBootstrapState();
    const [role0] = projectStore.roles;
    const [color0] = projectStore.colors;
    const [theme0] = projectStore.themes;
    const themeKey = theme0.name.toLowerCase();

    const result = {
      scales: {},
      errors: { critical: [], warnings: [], notices: [] },
      tokens: {
        [themeKey]: {
          [color0.name]: {
            0: {
              0: { value: '#112233', contrast: { ratio: 4.5, rating: 'AA' } },
            },
          },
        },
      },
    };

    render(<RoleTokensSection projectStore={projectStore} result={result} onSelect={() => {}} selectedRef={null} />);

    expect(screen.getByText(theme0.name)).toBeInTheDocument();
    expect(screen.getByText(color0.name)).toBeInTheDocument();
    expect(screen.getByText(role0.name)).toBeInTheDocument();
  });
});
