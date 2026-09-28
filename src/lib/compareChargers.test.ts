import { describe, expect, it } from 'vitest';
import { compareChargers, formatComparisonSummary } from './compareChargers';

const battery = {
  capacityWh: 10,
  remainingPercent: 0,
  efficiencyPercent: 100,
};

describe('compareChargers ordering', () => {
  it('marks the first charger faster when its time is shorter', () => {
    const comparison = compareChargers({
      ...battery,
      first: { voltageV: 5, currentA: 2 },
      second: { voltageV: 5, currentA: 1 },
    });

    expect(comparison.first.estimate.hours).toBe(1);
    expect(comparison.second.estimate.hours).toBe(2);
    expect(comparison.faster).toBe('first');
    expect(comparison.deltaHours).toBe(1);
    expect(formatComparisonSummary(comparison)).toBe('Первая быстрее на 1 ч');
  });

  it('marks the second charger faster when its time is shorter', () => {
    const comparison = compareChargers({
      ...battery,
      first: { voltageV: 5, currentA: 1 },
      second: { voltageV: 5, currentA: 4 },
    });

    expect(comparison.first.estimate.hours).toBe(2);
    expect(comparison.second.estimate.hours).toBe(0.5);
    expect(comparison.faster).toBe('second');
    expect(comparison.deltaHours).toBe(1.5);
    expect(formatComparisonSummary(comparison)).toBe('Вторая быстрее на 1 ч 30 мин');
  });

  it('treats equal times as a tie', () => {
    const comparison = compareChargers({
      ...battery,
      first: { voltageV: 5, currentA: 2 },
      second: { voltageV: 10, currentA: 1 },
    });

    expect(comparison.first.estimate.hours).toBe(1);
    expect(comparison.second.estimate.hours).toBe(1);
    expect(comparison.faster).toBeNull();
    expect(comparison.deltaHours).toBe(0);
    expect(formatComparisonSummary(comparison)).toBe('Одинаковое время');
  });

  it('ties at zero hours when a full battery is compared on two chargers', () => {
    const comparison = compareChargers({
      capacityWh: 50,
      remainingPercent: 100,
      efficiencyPercent: 100,
      first: { voltageV: 5, currentA: 1 },
      second: { voltageV: 9, currentA: 2 },
    });

    expect(comparison.first.estimate.hours).toBe(0);
    expect(comparison.second.estimate.hours).toBe(0);
    expect(comparison.faster).toBeNull();
    expect(comparison.deltaHours).toBe(0);
    expect(formatComparisonSummary(comparison)).toBe('Одинаковое время');
  });
});

describe('compareChargers shared battery', () => {
  it('applies the same remaining charge and efficiency to both chargers', () => {
    const comparison = compareChargers({
      capacityWh: 10,
      remainingPercent: 50,
      efficiencyPercent: 50,
      first: { voltageV: 5, currentA: 2 },
      second: { voltageV: 5, currentA: 1 },
    });

    expect(comparison.first.estimate.energyWh).toBe(5);
    expect(comparison.second.estimate.energyWh).toBe(5);
    expect(comparison.first.estimate.hours).toBe(1);
    expect(comparison.second.estimate.hours).toBe(2);
    expect(comparison.faster).toBe('first');
    expect(comparison.deltaHours).toBe(1);
  });

  it('does not order chargers when capacity is missing', () => {
    const comparison = compareChargers({
      capacityWh: null,
      remainingPercent: 0,
      efficiencyPercent: 100,
      first: { voltageV: 5, currentA: 2 },
      second: { voltageV: 5, currentA: 1 },
    });

    expect(comparison.first.specified).toBe(true);
    expect(comparison.second.specified).toBe(true);
    expect(comparison.first.estimate.hours).toBeNull();
    expect(comparison.second.estimate.hours).toBeNull();
    expect(comparison.faster).toBeNull();
    expect(comparison.deltaHours).toBeNull();
    expect(formatComparisonSummary(comparison)).toBeNull();
  });
});

describe('compareChargers empty side', () => {
  it('shows only the first estimate when the second charger is blank', () => {
    const comparison = compareChargers({
      ...battery,
      first: { voltageV: 5, currentA: 2 },
      second: { voltageV: null, currentA: null },
    });

    expect(comparison.first.specified).toBe(true);
    expect(comparison.first.estimate.hours).toBe(1);
    expect(comparison.second.specified).toBe(false);
    expect(comparison.second.estimate.hours).toBeNull();
    expect(comparison.faster).toBeNull();
    expect(comparison.deltaHours).toBeNull();
    expect(formatComparisonSummary(comparison)).toBeNull();
  });

  it('treats a charger with only one of voltage or current as empty', () => {
    const missingCurrent = compareChargers({
      ...battery,
      first: { voltageV: 5, currentA: 2 },
      second: { voltageV: 5, currentA: null },
    });
    const missingVoltage = compareChargers({
      ...battery,
      first: { voltageV: null, currentA: 2 },
      second: { voltageV: 9, currentA: 2 },
    });

    expect(missingCurrent.second.specified).toBe(false);
    expect(missingCurrent.faster).toBeNull();
    expect(missingVoltage.first.specified).toBe(false);
    expect(missingVoltage.second.estimate.hours).toBeCloseTo(10 / 18);
    expect(missingVoltage.faster).toBeNull();
  });

  it('does not turn a blank charger into a zero-hour full battery', () => {
    const comparison = compareChargers({
      capacityWh: 50,
      remainingPercent: 100,
      efficiencyPercent: 85,
      first: { voltageV: 5, currentA: 1 },
      second: { voltageV: null, currentA: null },
    });

    expect(comparison.first.estimate.hours).toBe(0);
    expect(comparison.second.specified).toBe(false);
    expect(comparison.second.estimate.hours).toBeNull();
    expect(comparison.faster).toBeNull();
    expect(comparison.deltaHours).toBeNull();
  });
});
