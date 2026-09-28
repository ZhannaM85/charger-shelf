import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CHARGER_SHELF_STORAGE_KEY } from '../lib/chargerShelf';
import { CALCULATOR_STORAGE_KEY } from '../lib/calculatorStorage';
import { HomePage } from '../pages/HomePage';

const USB_5V_1A = 'USB 5 В / 1 А, подставить 5 В · 1 А';
const USB_5V_2A = 'USB 5 В / 2 А, подставить 5 В · 2 А';
const USB_9V_2A = 'USB 9 В / 2 А, подставить 9 В · 2 А';

function storedChargers(): { name: string }[] {
  return JSON.parse(localStorage.getItem(CHARGER_SHELF_STORAGE_KEY) ?? '[]');
}

describe('charger shelf', () => {
  it('seeds three USB chargers on first launch and stores them', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Полка' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: USB_5V_1A })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: USB_5V_2A })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: USB_9V_2A })).toBeInTheDocument();
    expect(storedChargers().map((charger) => charger.name)).toEqual([
      'USB 5 В / 1 А',
      'USB 5 В / 2 А',
      'USB 9 В / 2 А',
    ]);
  });

  it('fills voltage and current from a tap and leaves the battery fields', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'мА·ч' }));
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '2000');
    await user.type(screen.getByLabelText('Остаток заряда'), '40');
    await user.click(screen.getByText('Дополнительно'));
    await user.clear(screen.getByLabelText('Эффективность'));
    await user.type(screen.getByLabelText('Эффективность'), '100');
    await user.click(screen.getByRole('button', { name: USB_5V_2A }));

    expect(screen.getByLabelText('Напряжение')).toHaveValue(5);
    expect(screen.getByLabelText('Ток')).toHaveValue(2);
    expect(screen.getByLabelText('Ёмкость аккумулятора')).toHaveValue(2000);
    expect(screen.getByLabelText('Остаток заряда')).toHaveValue(40);
    expect(screen.getByLabelText('Эффективность')).toHaveValue(100);
    expect(
      screen.getByRole('button', { name: 'мА·ч', pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: USB_5V_2A, pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('10 Вт')).toBeInTheDocument();
    expect(screen.getByText('36 мин')).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(CALCULATOR_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      voltage: '5',
      current: '2',
      capacity: '2000',
      remaining: '40',
      efficiency: '100',
      capacityUnit: 'mAh',
    });
  });

  it('adds a charger that survives reload and can be renamed', async () => {
    const user = userEvent.setup();
    const first = render(<HomePage />);

    await user.type(screen.getByLabelText('Название'), 'Ноутбук');
    await user.type(screen.getByLabelText('Напряжение зарядки'), '20');
    await user.type(screen.getByLabelText('Ток зарядки'), '3.25');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(screen.getByLabelText('Название')).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Ноутбук, подставить 20 В · 3.25 А' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Изменить Ноутбук' }));
    expect(screen.getByRole('heading', { name: 'Изменить зарядку' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Название'));
    await user.type(screen.getByLabelText('Название'), 'Блок 65 Вт');
    await user.clear(screen.getByLabelText('Ток зарядки'));
    await user.type(screen.getByLabelText('Ток зарядки'), '3');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(screen.queryByRole('button', { name: 'Сохранить' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Блок 65 Вт, подставить 20 В · 3 А' }),
    ).toBeInTheDocument();

    first.unmount();
    render(<HomePage />);

    await user.click(
      screen.getByRole('button', { name: 'Блок 65 Вт, подставить 20 В · 3 А' }),
    );
    expect(screen.getByLabelText('Напряжение')).toHaveValue(20);
    expect(screen.getByLabelText('Ток')).toHaveValue(3);
    expect(storedChargers().map((charger) => charger.name)).toContain('Блок 65 Вт');
    expect(storedChargers().map((charger) => charger.name)).not.toContain('Ноутбук');
  });

  it('does not add an invalid charger and cancel restores the empty form', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Введите название.')).toBeInTheDocument();
    expect(screen.getByText('Укажите напряжение больше 0.')).toBeInTheDocument();
    expect(screen.getByText('Укажите ток больше 0.')).toBeInTheDocument();
    expect(storedChargers()).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Изменить USB 5 В / 1 А' }));
    await user.type(screen.getByLabelText('Название'), ' ещё');
    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.getByLabelText('Название')).toHaveValue('');
    expect(screen.getByRole('button', { name: USB_5V_1A })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Новая зарядка' })).toBeInTheDocument();
  });

  it('deletes a charger from the list and from storage, and an empty shelf still calculates', async () => {
    const user = userEvent.setup();
    const first = render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Изменить USB 9 В / 2 А' }));
    await user.clear(screen.getByLabelText('Название'));
    await user.type(screen.getByLabelText('Название'), 'Быстрая');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(
      screen.getByRole('button', { name: 'Быстрая, подставить 9 В · 2 А' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Удалить Быстрая' }));
    expect(screen.queryByRole('button', { name: USB_9V_2A })).not.toBeInTheDocument();
    expect(storedChargers().map((charger) => charger.name)).toEqual([
      'USB 5 В / 1 А',
      'USB 5 В / 2 А',
    ]);

    await user.click(screen.getByRole('button', { name: 'Удалить USB 5 В / 1 А' }));
    await user.click(screen.getByRole('button', { name: 'Удалить USB 5 В / 2 А' }));
    expect(
      screen.getByText('Пока пусто. Напряжение и ток можно ввести вручную.'),
    ).toBeInTheDocument();
    expect(localStorage.getItem(CHARGER_SHELF_STORAGE_KEY)).toBe('[]');

    await user.type(screen.getByLabelText('Напряжение'), '5');
    await user.type(screen.getByLabelText('Ток'), '2');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');
    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();

    first.unmount();
    render(<HomePage />);

    expect(
      screen.getByText('Пока пусто. Напряжение и ток можно ввести вручную.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: USB_5V_1A })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Напряжение')).toHaveValue(5);
    expect(screen.getByText('1 ч 11 мин')).toBeInTheDocument();
  });
});
