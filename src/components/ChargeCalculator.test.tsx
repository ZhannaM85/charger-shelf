import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CALCULATOR_STORAGE_KEY } from '../lib/calculatorStorage';
import { HomePage } from '../pages/HomePage';

describe('home calculator', () => {
  it('renders the empty charge-time shell', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Полка зарядок' })).toBeInTheDocument();
    expect(screen.getByLabelText('Напряжение')).toBeInTheDocument();
    expect(screen.getByLabelText('Ток')).toBeInTheDocument();
    expect(screen.getByLabelText('Ёмкость аккумулятора')).toBeInTheDocument();
    expect(screen.getByLabelText('Остаток заряда')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Вт·ч', pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'мА·ч', pressed: false }),
    ).toBeInTheDocument();
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

  it('restores the last inputs after a reload and keeps a cleared field empty', async () => {
    const user = userEvent.setup();
    const first = render(<HomePage />);

    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');
    await user.type(screen.getByLabelText('Остаток заряда'), '40');
    await user.clear(screen.getByLabelText('Ток'));

    first.unmount();
    render(<HomePage />);

    expect(screen.getByLabelText('Напряжение')).toHaveValue(5);
    expect(screen.getByLabelText('Ток')).toHaveValue(null);
    expect(screen.getByLabelText('Ёмкость аккумулятора')).toHaveValue(10);
    expect(screen.getByLabelText('Остаток заряда')).toHaveValue(40);
    expect(screen.getByText('Нужны ёмкость и мощность')).toBeInTheDocument();
  });

  it('estimates the same time for equivalent mAh at the same voltage', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');
    expect(screen.getByText('1 ч')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Ёмкость аккумулятора'));
    await user.click(screen.getByRole('button', { name: 'мА·ч' }));
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '2000');

    expect(screen.getByText('10 Вт')).toBeInTheDocument();
    expect(screen.getByText('1 ч')).toBeInTheDocument();
  });

  it('asks for voltage instead of a time when mAh has no usable voltage', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'мА·ч' }));
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '2000');

    const voltageHint = 'Для мА·ч укажите напряжение больше 0.';
    expect(screen.getByText(voltageHint)).toBeInTheDocument();
    expect(screen.queryByText('Нужны ёмкость и мощность')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*ч/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*мин/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Напряжение'), '-1');
    expect(screen.getByText(voltageHint)).toBeInTheDocument();
    expect(screen.getByText('Введите 0 или больше.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Напряжение'));
    await user.type(screen.getByLabelText('Напряжение'), '0');
    expect(screen.getByText(voltageHint)).toBeInTheDocument();
    expect(screen.queryByText('0 мин')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Напряжение'));
    await user.type(screen.getByLabelText('Напряжение'), '5');
    expect(screen.getByText('1 ч')).toBeInTheDocument();
  });

  it('remembers the mAh unit after a reload', async () => {
    const user = userEvent.setup();
    const first = render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'мА·ч' }));
    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '2000');

    expect(
      JSON.parse(localStorage.getItem(CALCULATOR_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      capacity: '2000',
      capacityUnit: 'mAh',
    });

    first.unmount();
    render(<HomePage />);

    expect(
      screen.getByRole('button', { name: 'мА·ч', pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Ёмкость аккумулятора')).toHaveValue(2000);
    expect(screen.getByText('1 ч')).toBeInTheDocument();
  });

  it('treats a saved draft without a unit as watt-hours', () => {
    localStorage.setItem(
      CALCULATOR_STORAGE_KEY,
      JSON.stringify({ voltage: '5', current: '2', capacity: '10', remaining: '' }),
    );
    render(<HomePage />);

    expect(
      screen.getByRole('button', { name: 'Вт·ч', pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 ч')).toBeInTheDocument();
  });

  it('ignores a corrupt saved draft and starts empty', () => {
    localStorage.setItem(CALCULATOR_STORAGE_KEY, '{not-json');
    render(<HomePage />);

    expect(screen.getByLabelText('Напряжение')).toHaveValue(null);
    expect(screen.getByLabelText('Ток')).toHaveValue(null);
    expect(screen.getByLabelText('Ёмкость аккумулятора')).toHaveValue(null);
    expect(screen.getByLabelText('Остаток заряда')).toHaveValue(null);
  });
});
