export type ChargeInputs = {
  voltageV: number | null;
  currentA: number | null;
  capacityWh: number | null;
  /** Null means the battery is treated as empty (0%). */
  remainingPercent: number | null;
};

export type ChargeEstimate = {
  powerW: number | null;
  energyWh: number | null;
  hours: number | null;
};

export function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function nonNegative(value: number | null): number | null {
  if (value === null || value < 0) return null;
  return value;
}

export type CapacityUnit = 'Wh' | 'mAh';

export type CapacityInWh = {
  capacityWh: number | null;
  /** True when mAh was entered but voltage cannot convert it to Wh. */
  needsVoltage: boolean;
};

/**
 * Wh is used as entered. mAh converts with the pack voltage:
 * Wh = (mAh / 1000) × V.
 * Voltage must be greater than 0. Missing, zero, or negative voltage does not
 * produce a watt-hour value, so the UI can ask for voltage instead of a time.
 * A blank or negative amount is not a capacity, and does not ask for voltage.
 */
export function capacityInWh(
  amount: number | null,
  unit: CapacityUnit,
  voltageV: number | null,
): CapacityInWh {
  const safeAmount = nonNegative(amount);
  if (unit === 'Wh' || safeAmount === null) {
    return { capacityWh: safeAmount, needsVoltage: false };
  }

  const voltage = nonNegative(voltageV);
  if (voltage === null || voltage === 0) {
    return { capacityWh: null, needsVoltage: true };
  }

  return { capacityWh: (safeAmount / 1000) * voltage, needsVoltage: false };
}

/**
 * Power (W) = voltage (V) × current (A).
 * Energy still needed (Wh) = capacityWh × (100 − remaining%) / 100.
 * Hours = energyWh / powerW.
 * Blank remaining % is 0%. Hours stay null when capacity or usable power is missing,
 * except a battery that is already full, which estimates to 0 hours.
 */
export function estimateCharge(input: ChargeInputs): ChargeEstimate {
  const voltageV = nonNegative(input.voltageV);
  const currentA = nonNegative(input.currentA);
  const capacityWh = nonNegative(input.capacityWh);
  const powerW = voltageV !== null && currentA !== null ? voltageV * currentA : null;

  if (capacityWh === null) {
    return { powerW, energyWh: null, hours: null };
  }

  const remaining =
    input.remainingPercent === null
      ? 0
      : Math.min(100, Math.max(0, input.remainingPercent));
  const energyWh = (capacityWh * (100 - remaining)) / 100;

  if (energyWh === 0) {
    return { powerW, energyWh, hours: 0 };
  }

  if (powerW === null || powerW <= 0) {
    return { powerW, energyWh, hours: null };
  }

  return { powerW, energyWh, hours: energyWh / powerW };
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (wholeHours === 0) return `${minutes} мин`;
  if (minutes === 0) return `${wholeHours} ч`;
  return `${wholeHours} ч ${minutes} мин`;
}

export function formatQuantity(value: number, unit: string): string {
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${text} ${unit}`;
}
