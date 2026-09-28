import { Clock, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  estimateCharge,
  formatDuration,
  formatQuantity,
  parseNumber,
} from '../lib/chargeTime';

type FieldProps = {
  id: string;
  label: string;
  hint: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
};

function NumberField({ id, label, hint, value, unit, onChange }: FieldProps) {
  const parsed = parseNumber(value);
  const invalid = parsed !== null && parsed < 0;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      <p className="mt-0.5 text-xs text-stone-500">{hint}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none ring-amber-700 focus:ring-2"
        />
        <span className="w-12 shrink-0 text-sm text-stone-500">{unit}</span>
      </div>
      {invalid ? (
        <p className="mt-1 text-xs text-red-700">Введите 0 или больше.</p>
      ) : null}
    </div>
  );
}

export function ChargeCalculator() {
  const [voltage, setVoltage] = useState('');
  const [current, setCurrent] = useState('');
  const [capacity, setCapacity] = useState('');
  const [remaining, setRemaining] = useState('');

  const estimate = useMemo(
    () =>
      estimateCharge({
        voltageV: parseNumber(voltage),
        currentA: parseNumber(current),
        capacityWh: parseNumber(capacity),
        remainingPercent: parseNumber(remaining),
      }),
    [voltage, current, capacity, remaining],
  );

  const timeText =
    estimate.hours === null ? 'Нужны ёмкость и мощность' : formatDuration(estimate.hours);

  return (
    <form
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="grid gap-4">
        <NumberField
          id="voltage"
          label="Напряжение"
          hint="Напряжение на выходе зарядки."
          value={voltage}
          unit="В"
          onChange={setVoltage}
        />
        <NumberField
          id="current"
          label="Ток"
          hint="Ток на выходе зарядки."
          value={current}
          unit="А"
          onChange={setCurrent}
        />
        <NumberField
          id="capacity"
          label="Ёмкость аккумулятора"
          hint="Необязательно. В ватт-часах, не в мА·ч."
          value={capacity}
          unit="Вт·ч"
          onChange={setCapacity}
        />
        <NumberField
          id="remaining"
          label="Остаток заряда"
          hint="Необязательно. Пустое поле — это 0%."
          value={remaining}
          unit="%"
          onChange={setRemaining}
        />
      </div>

      <div className="mt-6 grid gap-3 rounded-xl bg-stone-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm text-stone-600">
            <Zap className="size-4" aria-hidden />
            Мощность зарядки
          </span>
          <output className="font-medium tabular-nums text-stone-900">
            {estimate.powerW === null ? '—' : formatQuantity(estimate.powerW, 'Вт')}
          </output>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm text-stone-600">
            <Clock className="size-4" aria-hidden />
            Время зарядки
          </span>
          <output className="text-right font-medium tabular-nums text-stone-900">
            {timeText}
          </output>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Время — это оставшиеся ватт-часы, делённые на вольты × амперы. Постоянная
        мощность, без потерь преобразования.
      </p>
    </form>
  );
}
