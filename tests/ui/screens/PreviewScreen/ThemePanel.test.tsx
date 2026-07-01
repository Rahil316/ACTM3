import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemePanel } from '../../../../src/ui/screens/PreviewScreen/ThemePanel';
import { makeBootstrapState } from '../../../../src/ui/store/projectStore';

describe('ThemePanel', () => {
  it('groups tokens by role and renders each role section when groupBy="role"', () => {
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

    render(<ThemePanel result={result} projectStore={projectStore} themeIdx={0} groupBy="role" viewMode="grid" />);

    expect(screen.getByText(role0.name)).toBeInTheDocument();
    expect(screen.getByText(color0.name)).toBeInTheDocument();
  });
});
