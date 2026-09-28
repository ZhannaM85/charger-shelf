import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CHARGER_SHELF_STORAGE_KEY } from '../lib/chargerShelf';
import { HomePage } from '../pages/HomePage';

function compareRegion() {
  return screen.getByRole('region', { name: 'Сравнение' });
}

async function setEfficiency(user: ReturnType<typeof userEvent.setup>, percent: string) {
  await user.click(screen.getByText('Дополнительно'));
  await user.clear(screen.getByLabelText('Эффективность'));
  await user.type(screen.getByLabelText('Эффективность'), percent);
}

describe('charger comparison', () => {
  it('updates both times and the winner, and keeps a single estimate when the second charger is empty', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await setEfficiency(user, '100');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');

    const compare = compareRegion();
    const first = within(compare).getByRole('group', { name: 'Первая зарядка' });
    const second = within(compare).getByRole('group', { name: 'Вторая зарядка' });

    await user.type(within(first).getByLabelText('Напряжение, первая'), '5');
    await user.type(within(first).getByLabelText('Ток, первая'), '2');

    expect(within(first).getByText('1 ч')).toBeInTheDocument();
    expect(within(second).getByText('Не задана')).toBeInTheDocument();
    expect(within(compare).queryByRole('status')).not.toBeInTheDocument();
    expect(within(first).queryByText('Быстрее')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Напряжение')).toHaveValue(null);
    expect(screen.getByLabelText('Ток')).toHaveValue(null);

    await user.type(within(second).getByLabelText('Напряжение, вторая'), '5');
    await user.type(within(second).getByLabelText('Ток, вторая'), '1');

    expect(within(first).getByText('1 ч')).toBeInTheDocument();
    expect(within(second).getByText('2 ч')).toBeInTheDocument();
    expect(within(first).getByText('Быстрее')).toBeInTheDocument();
    expect(within(second).queryByText('Быстрее')).not.toBeInTheDocument();
    expect(first).toHaveClass('bg-amber-50');
    expect(second).not.toHaveClass('bg-amber-50');
    expect(within(compare).getByRole('status')).toHaveTextContent(
      'Первая быстрее на 1 ч',
    );

    await user.clear(within(second).getByLabelText('Ток, вторая'));
    await user.type(within(second).getByLabelText('Ток, вторая'), '4');

    expect(within(second).getByText('30 мин')).toBeInTheDocument();
    expect(within(first).queryByText('Быстрее')).not.toBeInTheDocument();
    expect(within(second).getByText('Быстрее')).toBeInTheDocument();
    expect(second).toHaveClass('bg-amber-50');
    expect(first).not.toHaveClass('bg-amber-50');
    expect(within(compare).getByRole('status')).toHaveTextContent(
      'Вторая быстрее на 30 мин',
    );

    await user.clear(within(first).getByLabelText('Ток, первая'));
    await user.type(within(first).getByLabelText('Ток, первая'), '4');

    expect(within(first).getByText('30 мин')).toBeInTheDocument();
    expect(within(second).getByText('30 мин')).toBeInTheDocument();
    expect(within(compare).getByRole('status')).toHaveTextContent('Одинаковое время');
    expect(within(first).queryByText('Быстрее')).not.toBeInTheDocument();
    expect(within(second).queryByText('Быстрее')).not.toBeInTheDocument();
    expect(first).not.toHaveClass('bg-amber-50');
    expect(second).not.toHaveClass('bg-amber-50');

    await user.clear(within(second).getByLabelText('Напряжение, вторая'));
    await user.clear(within(second).getByLabelText('Ток, вторая'));

    expect(within(first).getByText('30 мин')).toBeInTheDocument();
    expect(within(second).getByText('Не задана')).toBeInTheDocument();
    expect(within(compare).queryByRole('status')).not.toBeInTheDocument();
    expect(within(first).queryByText('Быстрее')).not.toBeInTheDocument();
  });

  it('recalculates both times when remaining charge changes', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await setEfficiency(user, '100');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');

    const compare = compareRegion();
    const first = within(compare).getByRole('group', { name: 'Первая зарядка' });
    const second = within(compare).getByRole('group', { name: 'Вторая зарядка' });
    await user.type(within(first).getByLabelText('Напряжение, первая'), '5');
    await user.type(within(first).getByLabelText('Ток, первая'), '2');
    await user.type(within(second).getByLabelText('Напряжение, вторая'), '5');
    await user.type(within(second).getByLabelText('Ток, вторая'), '1');

    await user.type(screen.getByLabelText('Остаток заряда'), '50');

    expect(within(first).getByText('30 мин')).toBeInTheDocument();
    expect(within(second).getByText('1 ч')).toBeInTheDocument();
    expect(within(first).getByText('Быстрее')).toBeInTheDocument();
    expect(within(compare).getByRole('status')).toHaveTextContent(
      'Первая быстрее на 30 мин',
    );
  });

  it('fills both rows from the shelf and drops the link when a value is edited', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await setEfficiency(user, '100');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');

    await user.selectOptions(
      screen.getByLabelText('Первая с полки'),
      'USB 5 В / 1 А · 5 В · 1 А',
    );
    await user.selectOptions(
      screen.getByLabelText('Вторая с полки'),
      'USB 5 В / 2 А · 5 В · 2 А',
    );

    const compare = compareRegion();
    const first = within(compare).getByRole('group', { name: 'Первая зарядка' });
    const second = within(compare).getByRole('group', { name: 'Вторая зарядка' });

    expect(within(first).getByLabelText('Напряжение, первая')).toHaveValue(5);
    expect(within(first).getByLabelText('Ток, первая')).toHaveValue(1);
    expect(within(second).getByLabelText('Напряжение, вторая')).toHaveValue(5);
    expect(within(second).getByLabelText('Ток, вторая')).toHaveValue(2);
    expect(within(first).getByText('2 ч')).toBeInTheDocument();
    expect(within(second).getByText('1 ч')).toBeInTheDocument();
    expect(within(second).getByText('Быстрее')).toBeInTheDocument();
    expect(second).toHaveClass('bg-amber-50');
    expect(within(compare).getByRole('status')).toHaveTextContent(
      'Вторая быстрее на 1 ч',
    );

    await user.clear(within(second).getByLabelText('Ток, вторая'));
    await user.type(within(second).getByLabelText('Ток, вторая'), '1');

    expect(screen.getByLabelText('Вторая с полки')).toHaveValue('');
    expect(within(compare).getByRole('status')).toHaveTextContent('Одинаковое время');
    expect(screen.getByLabelText('Напряжение')).toHaveValue(null);
  });

  it('uses the calculator voltage once so both chargers share one mAh capacity', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await setEfficiency(user, '100');
    await user.click(screen.getByRole('button', { name: 'мА·ч' }));
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '2000');

    const compare = compareRegion();
    const first = within(compare).getByRole('group', { name: 'Первая зарядка' });
    await user.type(within(first).getByLabelText('Напряжение, первая'), '5');
    await user.type(within(first).getByLabelText('Ток, первая'), '2');

    expect(
      within(compare).getByText('Для мА·ч укажите напряжение больше 0.'),
    ).toBeInTheDocument();
    expect(within(first).getByText('—')).toBeInTheDocument();
    expect(within(compare).queryByRole('status')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Напряжение'), '5');
    const second = within(compare).getByRole('group', { name: 'Вторая зарядка' });
    await user.type(within(second).getByLabelText('Напряжение, вторая'), '20');
    await user.type(within(second).getByLabelText('Ток, вторая'), '2');

    expect(within(first).getByText('1 ч')).toBeInTheDocument();
    expect(within(second).getByText('15 мин')).toBeInTheDocument();
    expect(within(second).getByText('Быстрее')).toBeInTheDocument();
    expect(within(compare).getByRole('status')).toHaveTextContent(
      'Вторая быстрее на 45 мин',
    );
  });

  it('compares two manual chargers when the shelf is empty', async () => {
    localStorage.setItem(CHARGER_SHELF_STORAGE_KEY, '[]');
    const user = userEvent.setup();
    render(<HomePage />);
    await setEfficiency(user, '100');
    await user.type(screen.getByLabelText('Ёмкость аккумулятора'), '10');

    expect(screen.queryByLabelText('Первая с полки')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Вторая с полки')).not.toBeInTheDocument();

    const compare = compareRegion();
    const first = within(compare).getByRole('group', { name: 'Первая зарядка' });
    const second = within(compare).getByRole('group', { name: 'Вторая зарядка' });
    await user.type(within(first).getByLabelText('Напряжение, первая'), '5');
    await user.type(within(first).getByLabelText('Ток, первая'), '1');
    await user.type(within(second).getByLabelText('Напряжение, вторая'), '5');
    await user.type(within(second).getByLabelText('Ток, вторая'), '2');

    expect(within(first).getByText('2 ч')).toBeInTheDocument();
    expect(within(second).getByText('1 ч')).toBeInTheDocument();
    expect(within(compare).getByRole('status')).toHaveTextContent(
      'Вторая быстрее на 1 ч',
    );
  });
});
