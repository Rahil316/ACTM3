import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VariationTable } from '../../../../src/ui/components/cards/VariationTable';
import { useProjectStore, makeBootstrapState } from '../../../../src/ui/store/projectStore';

const makeVariation = (overrides = {}) => ({
  _id: 'v1', name: 'Default', shorthand: 'df', target: 4.5, ...overrides,
});

beforeEach(() => {
  useProjectStore.setState({ projectStore: makeBootstrapState() }, true);
});

describe('VariationTable', () => {
  const baseProps = {
    variations: [makeVariation()],
    canEdit: false,
    mappingMethod: 'contrast' as const,
    idx: 0,
    scaleLength: 11,
  };

  it('renders variation name in read-only mode', () => {
    render(<VariationTable {...baseProps} />);
    expect(screen.getByText(/Default/)).toBeInTheDocument();
  });

  it('shows shorthand in parentheses in read-only mode', () => {
    render(<VariationTable {...baseProps} variations={[makeVariation({ shorthand: 'df' })]} />);
    expect(screen.getByText(/\(df\)/)).toBeInTheDocument();
  });

  it('shows read-only headers without edit columns', () => {
    render(<VariationTable {...baseProps} />);
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Variation')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Short')).not.toBeInTheDocument();
  });

  it('shows edit headers when canEdit=true', () => {
    render(<VariationTable {...baseProps} canEdit={true} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Short')).toBeInTheDocument();
  });

  it('shows Add variation button when canEdit=true', () => {
    render(<VariationTable {...baseProps} canEdit={true} />);
    expect(screen.getByText('+ Add variation')).toBeInTheDocument();
  });

  it('hides Add variation button when canEdit=false', () => {
    render(<VariationTable {...baseProps} />);
    expect(screen.queryByText('+ Add variation')).not.toBeInTheDocument();
  });

  it('renders row number', () => {
    render(<VariationTable {...baseProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders multiple variation rows', () => {
    const variations = [
      makeVariation({ _id: 'v1', name: 'Subtle' }),
      makeVariation({ _id: 'v2', name: 'Strong' }),
    ];
    render(<VariationTable {...baseProps} variations={variations} />);
    expect(screen.getByText(/Subtle/)).toBeInTheDocument();
    expect(screen.getByText(/Strong/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('delete button disabled when only one variation', () => {
    render(<VariationTable {...baseProps} canEdit={true} />);
    const deleteBtn = screen.getByText('−');
    expect(deleteBtn.closest('button')).toBeDisabled();
  });

  it('delete button enabled with multiple variations', () => {
    const variations = [
      makeVariation({ _id: 'v1', name: 'Subtle' }),
      makeVariation({ _id: 'v2', name: 'Strong' }),
    ];
    render(<VariationTable {...baseProps} canEdit={true} variations={variations} />);
    const deleteBtns = screen.getAllByText('−');
    expect(deleteBtns[0].closest('button')).not.toBeDisabled();
  });

  it('calls setRoleVariation when name input changes', () => {
    const setRoleVariation = vi.fn();
    useProjectStore.setState({ setRoleVariation } as any);
    render(<VariationTable {...baseProps} canEdit={true} />);
    const nameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(nameInput, { target: { value: 'NewName' } });
    expect(setRoleVariation).toHaveBeenCalledWith(0, 0, 'name', 'NewName');
  });

  it('calls addRoleVariation when Add button clicked', () => {
    const addRoleVariation = vi.fn();
    useProjectStore.setState({ addRoleVariation } as any);
    render(<VariationTable {...baseProps} canEdit={true} />);
    fireEvent.click(screen.getByText('+ Add variation'));
    expect(addRoleVariation).toHaveBeenCalledWith(0);
  });
});
