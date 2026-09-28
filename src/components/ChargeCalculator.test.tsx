import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../pages/HomePage';

describe('home calculator', () => {
  it('renders the empty charge-time shell', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Полка зарядок' })).toBeInTheDocument();
    expect(screen.getByLabelText('Напряжение')).toBeInTheDocument();
    expect(screen.getByLabelText('Ток')).toBeInTheDocument();
    expect(screen.getByLabelText('Ёмкость аккумулятора')).toBeInTheDocument();
    expect(screen.getByLabelText('Остаток заряда')).toBeInTheDocument();
    expect(screen.getByText('Нужны ёмкость и мощность')).toBeInTheDocument();
  });

  it('estimates one hour for 10 Wh at 5 V and 2 A', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');

    expect(screen.getByText('10 Вт')).toBeInTheDocument();
    expect(screen.getByText('1 ч')).toBeInTheDocument();
  });
});
