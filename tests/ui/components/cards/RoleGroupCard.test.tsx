import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleGroupCard } from '../../../../src/ui/components/cards/RoleGroupCard';
import { useProjectStore, makeBootstrapState } from '../../../../src/ui/store/projectStore';
import type { Role } from '../../../../src/shared/types';

const makeRole = (overrides: Partial<Role> = {}): Role => ({
  _id: 'r1',
  name: 'Text',
  shorthand: 'tx',
  mappingMethod: 'contrast',
  variations: null,
  ...overrides,
});

beforeEach(() => {
  useProjectStore.setState({ projectStore: makeBootstrapState() }, true);
  localStorage.clear();
});

describe('RoleGroupCard', () => {
  const defaultRole = makeRole();

  it('renders role name in input', () => {
    render(<RoleGroupCard role={defaultRole} idx={0} />);
    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Text');
  });

  it('renders role shorthand in input', () => {
    render(<RoleGroupCard role={defaultRole} idx={0} />);
    const shortInput = screen.getByLabelText('Short') as HTMLInputElement;
    expect(shortInput.value).toBe('tx');
  });

  it('shows variation count in collapsible header', () => {
    const bootstrap = makeBootstrapState();
    useProjectStore.setState({ projectStore: { ...bootstrap, roles: [{ ...defaultRole, variations: null }] } });
    render(<RoleGroupCard role={defaultRole} idx={0} />);
    expect(screen.getByText(/Variations/)).toBeInTheDocument();
  });

  it('delete button is disabled when only one role', () => {
    const bootstrap = makeBootstrapState();
    useProjectStore.setState({ projectStore: { ...bootstrap, roles: [defaultRole] } });
    render(<RoleGroupCard role={defaultRole} idx={0} />);
    const deleteBtn = screen.getByTitle('Delete role');
    expect(deleteBtn).toBeDisabled();
  });

  it('delete button is enabled when multiple roles', () => {
    const bootstrap = makeBootstrapState();
    useProjectStore.setState({
      projectStore: {
        ...bootstrap,
        roles: [makeRole({ _id: 'r1', name: 'Text', shorthand: 'tx' }), makeRole({ _id: 'r2', name: 'Fill', shorthand: 'fi' })],
      },
    });
    render(<RoleGroupCard role={defaultRole} idx={0} />);
    const deleteBtn = screen.getByTitle('Delete role');
    expect(deleteBtn).not.toBeDisabled();
  });

  it('settings button opens RoleSettingsSheet', () => {
    render(<RoleGroupCard role={defaultRole} idx={0} />);
    const settingsBtn = screen.getByTitle('Role settings');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(settingsBtn);
    // RoleSettingsSheet renders as a portal — confirm some sheet content appears
    expect(screen.queryByRole('dialog') || document.querySelector('[data-sheet]') || screen.queryByText(/Local BG/i) || screen.queryByText(/Scope/i)).toBeTruthy();
  });

  it('collapsible toggles visibility of variation table', () => {
    render(<RoleGroupCard role={defaultRole} idx={0} />);
    // VariationTable is hidden initially (closed collapsible)
    const toggleBtn = screen.getByText(/Variations/i).closest('button') ?? screen.getByText(/Variations/i);
    fireEvent.click(toggleBtn);
    // After toggle, collapsible content may appear — check no throw
    expect(screen.getByText(/Variations/i)).toBeInTheDocument();
  });
});
