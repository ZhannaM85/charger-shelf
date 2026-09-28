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
    expect(screen.getByText('Дополнительно')).toBeInTheDocument();
    expect(screen.getByLabelText('Эффективность')).toHaveValue(85);
    expect(
      screen.getByRole('button', { name: 'Вт·ч', pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'мА·ч', pressed: false }),
    ).toBeInTheDocument();
    expect(screen.getByText('Нужны ёмкость и мощность')).toBeInTheDocument();
  });

  it('estimates one hour for 10 Wh at 5 V and 2 A when efficiency is 100%', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByText('Дополнительно'));
    await user.clear(screen.getByLabelText('Эффективность'));
    await user.type(screen.getByLabelText('Эффективность'), '100');
    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');

    expect(screen.getByText('10 Вт')).toBeInTheDocument();
    expect(screen.getByText('1 ч')).toBeInTheDocument();
  });

  it('applies the default 85% efficiency and doubles time at 50%', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');

    expect(screen.getByText('10 Вт')).toBeInTheDocument();
    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();

    await user.click(screen.getByText('Дополнительно'));
    await user.clear(screen.getByLabelText('Эффективность'));
    await user.type(screen.getByLabelText('Эффективность'), '50');

    expect(screen.getByText('2 ч')).toBeInTheDocument();
  });

  it('treats a blank efficiency as 85% and does not estimate an out-of-range value', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');
    await user.click(screen.getByText('Дополнительно'));
    await user.clear(screen.getByLabelText('Эффективность'));

    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();
    expect(screen.queryByText('Введите значение от 50 до 100.')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Эффективность'), '10');
    expect(screen.getByText('Введите значение от 50 до 100.')).toBeInTheDocument();
    expect(screen.getByText('Укажите эффективность от 50 до 100.')).toBeInTheDocument();
    expect(screen.getByText('10 Вт')).toBeInTheDocument();
    expect(screen.queryByText('1 ч 11 мин')).not.toBeInTheDocument();
    expect(screen.queryByText('2 ч')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Эффективность'));
    await user.type(screen.getByLabelText('Эффективность'), '200');
    expect(screen.getByText('Укажите эффективность от 50 до 100.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Эффективность'));
    await user.type(screen.getByLabelText('Эффективность'), '-1');
    expect(screen.getByText('Укажите эффективность от 50 до 100.')).toBeInTheDocument();
    expect(screen.queryByText('0 мин')).not.toBeInTheDocument();
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
    expect(screen.getByLabelText('Эффективность')).toHaveValue(85);
    expect(screen.getByText('Нужны ёмкость и мощность')).toBeInTheDocument();
  });

  it('estimates the same time for equivalent mAh at the same voltage', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');
    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Ёмкость аккумулятора'));
    await user.click(screen.getByRole('button', { name: 'мА·ч' }));
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '2000');

    expect(screen.getByText('10 Вт')).toBeInTheDocument();
    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();
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
    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();
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
    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();
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
    expect(screen.getByLabelText('Эффективность')).toHaveValue(85);
    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();
  });

  it('remembers a changed efficiency after a reload', async () => {
    const user = userEvent.setup();
    const first = render(<HomePage />);

    await user.click(screen.getByText('Дополнительно'));
    await user.clear(screen.getByLabelText('Эффективность'));
    await user.type(screen.getByLabelText('Эффективность'), '50');
    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');

    expect(
      JSON.parse(localStorage.getItem(CALCULATOR_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({ efficiency: '50' });

    first.unmount();
    render(<HomePage />);

    expect(screen.getByLabelText('Эффективность')).toHaveValue(50);
    expect(screen.getByText('2 ч')).toBeInTheDocument();
  });

  it('ignores a corrupt saved draft and starts empty', () => {
    localStorage.setItem(CALCULATOR_STORAGE_KEY, '{not-json');
    render(<HomePage />);

    expect(screen.getByLabelText('Напряжение')).toHaveValue(null);
    expect(screen.getByLabelText('Ток')).toHaveValue(null);
    expect(screen.getByLabelText('Ёмкость аккумулятора')).toHaveValue(null);
    expect(screen.getByLabelText('Остаток заряда')).toHaveValue(null);
    expect(screen.getByLabelText('Эффективность')).toHaveValue(85);
  });
});
