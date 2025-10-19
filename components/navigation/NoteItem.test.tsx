import { render, screen, fireEvent } from '@testing-library/react';
import { NoteItem } from './NoteItem';
import { Note } from '@/types';

describe('NoteItem', () => {
  const mockNote: Note = {
    id: 'n1',
    title: 'Test Note',
    folioId: 'f1',
    folderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
    expect(mockProps.onClick).toHaveBeenCalledWith('n1');
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
