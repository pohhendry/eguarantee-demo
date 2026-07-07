import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('renders both mode options', () => {
    render(<LandingPage onSelect={vi.fn()} />);
    expect(screen.getByText(/fill in form/i)).toBeInTheDocument();
    expect(screen.getByText(/upload excel/i)).toBeInTheDocument();
  });

  it('calls onSelect with "form" when Fill in Form is clicked', () => {
    const onSelect = vi.fn();
    render(<LandingPage onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/fill in form/i));
    expect(onSelect).toHaveBeenCalledWith('form');
  });

  it('calls onSelect with "excel" when Upload Excel is clicked', () => {
    const onSelect = vi.fn();
    render(<LandingPage onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/upload excel/i));
    expect(onSelect).toHaveBeenCalledWith('excel');
  });
});
