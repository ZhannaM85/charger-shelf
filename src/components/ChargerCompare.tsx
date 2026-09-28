import { useState } from 'react';
import type { CalculatorDraft } from '../lib/calculatorStorage';
import {
  compareChargers,
  formatComparisonSummary,
  type CompareSideResult,
} from '../lib/compareChargers';
import { chargerInputValue, formatChargerSpec, type Charger } from '../lib/chargerShelf';
import {
  capacityInWh,
  efficiencyFactor,
  formatDuration,
  parseNumber,
} from '../lib/chargeTime';

type SlotState = {
  voltage: string;
  amps: string;
  chargerId: string;
};

const EMPTY_SLOT: SlotState = { voltage: '', amps: '', chargerId: '' };

const fieldClassName =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none ring-amber-700 focus:ring-2';

type ChargerCompareProps = {
  draft: CalculatorDraft;
  chargers: readonly Charger[];
};

function linkedChargerId(slot: SlotState, chargers: readonly Charger[]): string {
  return chargers.some((charger) => charger.id === slot.chargerId) ? slot.chargerId : '';
}

function sideTimeText(side: CompareSideResult, blocked: boolean): string {
  if (!side.specified) return 'Не задана';
  if (blocked) return '—';
  if (side.estimate.hours === null) return 'Нужны ёмкость и мощность';
  return formatDuration(side.estimate.hours);
}

export function ChargerCompare({ draft, chargers }: ChargerCompareProps) {
  const [first, setFirst] = useState<SlotState>(EMPTY_SLOT);
  const [second, setSecond] = useState<SlotState>(EMPTY_SLOT);

  const efficiencyPercent = parseNumber(draft.efficiency);
  const efficiencyInvalid =
    efficiencyPercent !== null && efficiencyFactor(efficiencyPercent) === null;
  const capacity = capacityInWh(
    parseNumber(draft.capacity),
    draft.capacityUnit,
    parseNumber(draft.voltage),
  );

  const comparison = compareChargers({
    capacityWh: capacity.capacityWh,
    remainingPercent: parseNumber(draft.remaining),
    efficiencyPercent,
    first: {
      voltageV: parseNumber(first.voltage),
      currentA: parseNumber(first.amps),
    },
    second: {
      voltageV: parseNumber(second.voltage),
      currentA: parseNumber(second.amps),
    },
  });

  const batteryBlocked = capacity.needsVoltage || efficiencyInvalid;
  const summary = batteryBlocked ? null : formatComparisonSummary(comparison);
  const batteryNote = capacity.needsVoltage
    ? 'Для мА·ч укажите напряжение больше 0.'
    : efficiencyInvalid
      ? 'Укажите эффективность от 50 до 100.'
      : null;

  const pick = (
    slot: SlotState,
    setSlot: (next: SlotState) => void,
    chargerId: string,
  ) => {
    const charger = chargers.find((item) => item.id === chargerId);
    if (!charger) {
      setSlot({ ...slot, chargerId: '' });
      return;
    }
    setSlot({
      chargerId: charger.id,
      voltage: chargerInputValue(charger.voltage),
      amps: chargerInputValue(charger.current),
    });
  };

  const edit =
    (slot: SlotState, setSlot: (next: SlotState) => void, field: 'voltage' | 'amps') =>
    (value: string) => {
      const voltage = field === 'voltage' ? value : slot.voltage;
      const amps = field === 'amps' ? value : slot.amps;
      const selected = chargers.find((item) => item.id === slot.chargerId);
      const stillLinked =
        selected !== undefined &&
        chargerInputValue(selected.voltage) === voltage &&
        chargerInputValue(selected.current) === amps;
      setSlot({
        voltage,
        amps,
        chargerId: stillLinked ? slot.chargerId : '',
      });
    };

  return (
    <section
      aria-labelledby="charger-compare-heading"
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <h2 id="charger-compare-heading" className="text-lg font-semibold tracking-tight">
        Сравнение
      </h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        Одна батарея: ёмкость, остаток и эффективность из калькулятора. Две зарядки.
      </p>

      <div className="mt-4 grid gap-3">
        <CompareRow
          title="Первая"
          groupLabel="Первая зарядка"
          shelfLabel="Первая с полки"
          voltageId="compare-first-voltage"
          currentId="compare-first-current"
          voltageLabel="Напряжение, первая"
          currentLabel="Ток, первая"
          chargers={chargers}
          slot={first}
          chargerId={linkedChargerId(first, chargers)}
          timeText={sideTimeText(comparison.first, batteryBlocked)}
          faster={comparison.faster === 'first'}
          onPick={(chargerId) => pick(first, setFirst, chargerId)}
          onVoltage={edit(first, setFirst, 'voltage')}
          onCurrent={edit(first, setFirst, 'amps')}
        />
        <CompareRow
          title="Вторая"
          groupLabel="Вторая зарядка"
          shelfLabel="Вторая с полки"
          voltageId="compare-second-voltage"
          currentId="compare-second-current"
          voltageLabel="Напряжение, вторая"
          currentLabel="Ток, вторая"
          chargers={chargers}
          slot={second}
          chargerId={linkedChargerId(second, chargers)}
          timeText={sideTimeText(comparison.second, batteryBlocked)}
          faster={comparison.faster === 'second'}
          onPick={(chargerId) => pick(second, setSecond, chargerId)}
          onVoltage={edit(second, setSecond, 'voltage')}
          onCurrent={edit(second, setSecond, 'amps')}
        />
      </div>

      {batteryNote && (comparison.first.specified || comparison.second.specified) ? (
        <p className="mt-4 text-sm font-medium text-amber-900">{batteryNote}</p>
      ) : null}
      {summary ? (
        <p className="mt-4 text-sm font-medium text-stone-900" role="status">
          {summary}
        </p>
      ) : null}
    </section>
  );
}

function CompareRow({
  title,
  groupLabel,
  shelfLabel,
  voltageId,
  currentId,
  voltageLabel,
  currentLabel,
  chargers,
  slot,
  chargerId,
  timeText,
  faster,
  onPick,
  onVoltage,
  onCurrent,
}: {
  title: string;
  groupLabel: string;
  shelfLabel: string;
  voltageId: string;
  currentId: string;
  voltageLabel: string;
  currentLabel: string;
  chargers: readonly Charger[];
  slot: SlotState;
  chargerId: string;
  timeText: string;
  faster: boolean;
  onPick: (chargerId: string) => void;
  onVoltage: (value: string) => void;
  onCurrent: (value: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={groupLabel}
      className={
        faster
          ? 'rounded-xl border border-amber-700 bg-amber-50 p-3'
          : 'rounded-xl border border-stone-200 bg-stone-50 p-3'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-stone-800">{title}</h3>
        {faster ? (
          <span className="text-sm font-medium text-amber-900">Быстрее</span>
        ) : null}
      </div>

      {chargers.length > 0 ? (
        <div className="mt-3">
          <label htmlFor={`${voltageId}-shelf`} className="block text-sm text-stone-600">
            С полки
          </label>
          <select
            id={`${voltageId}-shelf`}
            aria-label={shelfLabel}
            value={chargerId}
            onChange={(event) => onPick(event.target.value)}
            className={`mt-1.5 ${fieldClassName}`}
          >
            <option value="">Вручную</option>
            {chargers.map((charger) => (
              <option key={charger.id} value={charger.id}>
                {charger.name} · {formatChargerSpec(charger)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3">
        <SlotNumberField
          id={voltageId}
          label={voltageLabel}
          unit="В"
          value={slot.voltage}
          onChange={onVoltage}
        />
        <SlotNumberField
          id={currentId}
          label={currentLabel}
          unit="А"
          value={slot.amps}
          onChange={onCurrent}
        />
      </div>

      <p className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-stone-600">Время</span>
        <span className="font-medium tabular-nums text-stone-900">{timeText}</span>
      </p>
    </div>
  );
}

function SlotNumberField({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseNumber(value);
  const invalid = parsed !== null && parsed < 0;

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-stone-600">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClassName}
        />
        <span className="w-6 shrink-0 text-sm text-stone-500">{unit}</span>
      </div>
      {invalid ? (
        <p className="mt-1 text-xs text-red-700">Введите 0 или больше.</p>
      ) : null}
    </div>
  );
}
