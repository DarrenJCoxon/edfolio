/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteItem } from './NoteItem';
import { createMockNote } from '@/__tests__/utils/test-data';

describe('NoteItem', () => {
  const mockNote = createMockNote({
    id: 'clh0e8r5k0000jw0c8y5d6not1',
    title: 'Test Note',
    folioId: 'f1',
    folderId: null,
  });

  const mockProps = {
    note: mockNote,
    depth: 0,
    isActive: false,
    onClick: jest.fn(),
    onRename: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render note title', () => {
    render(<NoteItem {...mockProps} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    render(<NoteItem {...mockProps} />);
    const noteItem = screen.getByRole('treeitem');
    fireEvent.click(noteItem);
    expect(mockProps.onClick).toHaveBeenCalledWith('clh0e8r5k0000jw0c8y5d6not1');
  });

  it('should apply active styles when isActive is true', () => {
    render(<NoteItem {...mockProps} isActive={true} />);
    const noteItem = screen.getByRole('treeitem');
    expect(noteItem).toHaveClass('bg-[var(--accent)]/10');
  });

  it('should render with correct indentation depth', () => {
    render(<NoteItem {...mockProps} depth={2} />);
    const noteItem = screen.getByRole('treeitem');
    const style = noteItem.style.paddingLeft;
    expect(style).toContain('calc(var(--spacing-sm) + 2 * var(--spacing-md))');
  });

  it('should have proper ARIA attributes', () => {
    render(<NoteItem {...mockProps} isActive={true} />);
    const noteItem = screen.getByRole('treeitem');
    expect(noteItem).toHaveAttribute('aria-label', 'Test Note');
    expect(noteItem).toHaveAttribute('aria-selected', 'true');
  });

  it('should be keyboard accessible', () => {
    render(<NoteItem {...mockProps} />);
    const noteItem = screen.getByRole('treeitem');
    expect(noteItem).toHaveAttribute('tabIndex', '0');
  });
});