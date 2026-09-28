import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../pages/HomePage';

describe('home calculator', () => {
  it('renders the empty charge-time shell', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Charger Shelf' })).toBeInTheDocument();
    expect(screen.getByLabelText('Voltage')).toBeInTheDocument();
    expect(screen.getByLabelText('Current')).toBeInTheDocument();
    expect(screen.getByLabelText('Battery capacity')).toBeInTheDocument();
    expect(screen.getByLabelText('Remaining charge')).toBeInTheDocument();
    expect(screen.getByText('Needs capacity and charger power')).toBeInTheDocument();
  });

  it('estimates one hour for 10 Wh at 5 V and 2 A', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.type(screen.getByLabelText('Voltage'), '5');
    await user.type(screen.getByLabelText('Current'), '2');
    await user.type(screen.getByLabelText('Battery capacity'), '10');

    expect(screen.getByText('10 W')).toBeInTheDocument();
    expect(screen.getByText('1 h')).toBeInTheDocument();
  });
});
