import { Clock, Zap } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  loadCalculatorDraft,
  readBrowserStorage,
  saveCalculatorDraft,
  type CalculatorDraft,
  type CalculatorField,
} from '../lib/calculatorStorage';
import {
  capacityInWh,
  efficiencyFactor,
  estimateCharge,
  formatDuration,
  formatQuantity,
  MAX_EFFICIENCY_PERCENT,
  MIN_EFFICIENCY_PERCENT,
  parseNumber,
  type CapacityUnit,
} from '../lib/chargeTime';

const MAH_VOLTAGE_HINT = 'Для мА·ч укажите напряжение больше 0.';

type FieldProps = {
  id: string;
  label: string;
  hint: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
  headerExtra?: ReactNode;
  minimum?: number;
  maximum?: number;
  invalidMessage?: string;
};

function NumberField({
  id,
  label,
  hint,
  value,
  unit,
  onChange,
  headerExtra,
  minimum = 0,
  maximum,
  invalidMessage = 'Введите 0 или больше.',
}: FieldProps) {
  const parsed = parseNumber(value);
  const invalid =
    parsed !== null && (parsed < minimum || (maximum !== undefined && parsed > maximum));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium text-stone-800">
          {label}
        </label>
        {headerExtra}
      </div>
      <p className="mt-0.5 text-xs text-stone-500">{hint}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={minimum}
          max={maximum}
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none ring-amber-700 focus:ring-2"
        />
        <span className="w-14 shrink-0 text-sm text-stone-500">{unit}</span>
      </div>
      {invalid ? <p className="mt-1 text-xs text-red-700">{invalidMessage}</p> : null}
    </div>
  );
}

function CapacityUnitToggle({
  unit,
  onChange,
}: {
  unit: CapacityUnit;
  onChange: (unit: CapacityUnit) => void;
}) {
  const options: { unit: CapacityUnit; label: string }[] = [
    { unit: 'Wh', label: 'Вт·ч' },
    { unit: 'mAh', label: 'мА·ч' },
  ];

  return (
    <div
      role="group"
      aria-label="Единица ёмкости"
      className="flex rounded-lg bg-stone-100 p-0.5"
    >
      {options.map((option) => {
        const selected = unit === option.unit;
        return (
          <button
            key={option.unit}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.unit)}
            className={
              selected
                ? 'rounded-md bg-white px-2 py-1 text-xs font-medium text-stone-900 shadow-sm'
                : 'rounded-md px-2 py-1 text-xs text-stone-500'
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function useCalculatorDraft(): {
  draft: CalculatorDraft;
  setField: (field: CalculatorField, value: string) => void;
  setCapacityUnit: (unit: CapacityUnit) => void;
} {
  const [draft, setDraft] = useState<CalculatorDraft>(() =>
    loadCalculatorDraft(readBrowserStorage()),
  );

  useEffect(() => {
    saveCalculatorDraft(readBrowserStorage(), draft);
  }, [draft]);

  const setField = (field: CalculatorField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const setCapacityUnit = (capacityUnit: CapacityUnit) => {
    setDraft((current) => ({ ...current, capacityUnit }));
  };

  return { draft, setField, setCapacityUnit };
}

export function ChargeCalculator() {
  const { draft, setField, setCapacityUnit } = useCalculatorDraft();
  const { voltage, current, capacity, remaining, efficiency, capacityUnit } = draft;
  const capacityMah = capacityUnit === 'mAh';
  const efficiencyPercent = parseNumber(efficiency);
  const efficiencyInvalid =
    efficiencyPercent !== null && efficiencyFactor(efficiencyPercent) === null;

  const estimate = useMemo(() => {
    const voltageV = parseNumber(voltage);
    const resolved = capacityInWh(parseNumber(capacity), capacityUnit, voltageV);
    return {
      ...estimateCharge({
        voltageV,
        currentA: parseNumber(current),
        capacityWh: resolved.capacityWh,
        remainingPercent: parseNumber(remaining),
        efficiencyPercent: parseNumber(efficiency),
      }),
      needsVoltage: resolved.needsVoltage,
    };
  }, [voltage, current, capacity, remaining, efficiency, capacityUnit]);

  const timeText = estimate.needsVoltage
    ? MAH_VOLTAGE_HINT
    : efficiencyInvalid
      ? 'Укажите эффективность от 50 до 100.'
      : estimate.hours === null
        ? 'Нужны ёмкость и мощность'
        : formatDuration(estimate.hours);

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
          onChange={(value) => setField('voltage', value)}
        />
        <NumberField
          id="current"
          label="Ток"
          hint="Ток на выходе зарядки."
          value={current}
          unit="А"
          onChange={(value) => setField('current', value)}
        />
        <NumberField
          id="capacity"
          label="Ёмкость аккумулятора"
          hint={
            capacityMah
              ? 'Необязательно. Вт·ч = (мА·ч / 1000) × напряжение.'
              : 'Необязательно. В ватт-часах.'
          }
          value={capacity}
          unit={capacityMah ? 'мА·ч' : 'Вт·ч'}
          onChange={(value) => setField('capacity', value)}
          headerExtra={
            <CapacityUnitToggle unit={capacityUnit} onChange={setCapacityUnit} />
          }
        />
        <NumberField
          id="remaining"
          label="Остаток заряда"
          hint="Необязательно. Пустое поле — это 0%."
          value={remaining}
          unit="%"
          onChange={(value) => setField('remaining', value)}
        />
        <details className="rounded-lg border border-stone-200 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-stone-700">
            Дополнительно
          </summary>
          <div className="mt-3">
            <NumberField
              id="efficiency"
              label="Эффективность"
              hint="От 50 до 100. Пустое поле считается как 85%."
              value={efficiency}
              unit="%"
              minimum={MIN_EFFICIENCY_PERCENT}
              maximum={MAX_EFFICIENCY_PERCENT}
              invalidMessage="Введите значение от 50 до 100."
              onChange={(value) => setField('efficiency', value)}
            />
          </div>
        </details>
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
          <output
            className={
              estimate.needsVoltage
                ? 'text-right text-sm font-medium text-amber-900'
                : 'text-right font-medium tabular-nums text-stone-900'
            }
          >
            {timeText}
          </output>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Время — оставшиеся ватт-часы, делённые на вольты × амперы × эффективность. По
        умолчанию 85%. Постоянные напряжение и ток, без спада у полного заряда.
      </p>
    </form>
  );
}
