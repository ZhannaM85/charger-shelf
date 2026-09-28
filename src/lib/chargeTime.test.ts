import { describe, expect, it } from 'vitest';
import {
  capacityInWh,
  efficiencyFactor,
  estimateCharge,
  formatDuration,
  parseNumber,
} from './chargeTime';

describe('estimateCharge', () => {
  it('matches volts times amps at 100% efficiency', () => {
    const estimate = estimateCharge({
      voltageV: 5,
      currentA: 2,
      capacityWh: 10,
      remainingPercent: 0,
      efficiencyPercent: 100,
    });

    expect(estimate.powerW).toBe(10);
    expect(estimate.energyWh).toBe(10);
    expect(estimate.hours).toBe(1);
  });

  it('treats a blank remaining percent as an empty battery', () => {
    const estimate = estimateCharge({
      voltageV: 20,
      currentA: 1,
      capacityWh: 40,
      remainingPercent: null,
      efficiencyPercent: 100,
    });

    expect(estimate.hours).toBe(2);
  });

  it('uses only the unfilled share of capacity', () => {
    const estimate = estimateCharge({
      voltageV: 10,
      currentA: 1,
      capacityWh: 20,
      remainingPercent: 75,
      efficiencyPercent: 100,
    });

    expect(estimate.energyWh).toBe(5);
    expect(estimate.hours).toBe(0.5);
  });

  it('returns power without a time when capacity is omitted', () => {
    const estimate = estimateCharge({
      voltageV: 9,
      currentA: 2,
      capacityWh: null,
      remainingPercent: null,
    });

    expect(estimate.powerW).toBe(18);
    expect(estimate.hours).toBeNull();
  });

  it('estimates zero time when the battery is already full', () => {
    const estimate = estimateCharge({
      voltageV: null,
      currentA: null,
      capacityWh: 50,
      remainingPercent: 100,
    });

    expect(estimate.hours).toBe(0);
  });

  it('uses 85% when efficiency is omitted or blank', () => {
    const base = {
      voltageV: 5,
      currentA: 2,
      capacityWh: 10,
      remainingPercent: 0,
    };
    const expected = 10 / (5 * 2 * 0.85);

    expect(estimateCharge(base).hours).toBeCloseTo(expected);
    expect(estimateCharge({ ...base, efficiencyPercent: null }).hours).toBeCloseTo(
      expected,
    );
    expect(estimateCharge(base).powerW).toBe(10);
    expect(estimateCharge(base).energyWh).toBe(10);
  });

  it('doubles the ideal time at 50% efficiency', () => {
    const base = {
      voltageV: 5,
      currentA: 2,
      capacityWh: 10,
      remainingPercent: 0,
    };
    const ideal = estimateCharge({ ...base, efficiencyPercent: 100 });
    const half = estimateCharge({ ...base, efficiencyPercent: 50 });

    expect(ideal.hours).toBe(1);
    expect(half.hours).toBe(2);
    expect(half.energyWh).toBe(ideal.energyWh);
    expect(half.powerW).toBe(ideal.powerW);
  });

  it('returns energy without a time when efficiency is outside 50–100', () => {
    for (const efficiencyPercent of [
      -10,
      0,
      49.9,
      100.1,
      200,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      const estimate = estimateCharge({
        voltageV: 5,
        currentA: 2,
        capacityWh: 10,
        remainingPercent: 0,
        efficiencyPercent,
      });

      expect(estimate.powerW).toBe(10);
      expect(estimate.energyWh).toBe(10);
      expect(estimate.hours).toBeNull();
    }
  });

  it('keeps a full battery at zero hours even when efficiency is unusable', () => {
    const estimate = estimateCharge({
      voltageV: 5,
      currentA: 2,
      capacityWh: 50,
      remainingPercent: 100,
      efficiencyPercent: 0,
    });

    expect(estimate.hours).toBe(0);
    expect(estimate.energyWh).toBe(0);
  });
});

describe('efficiencyFactor', () => {
  it('treats blank as 85% and rejects values outside 50–100', () => {
    expect(efficiencyFactor(null)).toBe(0.85);
    expect(efficiencyFactor(undefined)).toBe(0.85);
    expect(efficiencyFactor(100)).toBe(1);
    expect(efficiencyFactor(50)).toBe(0.5);
    expect(efficiencyFactor(85)).toBe(0.85);
    expect(efficiencyFactor(49)).toBeNull();
    expect(efficiencyFactor(101)).toBeNull();
    expect(efficiencyFactor(Number.NaN)).toBeNull();
  });
});

describe('capacityInWh', () => {
  it('matches a watt-hour estimate for equivalent milliamp-hours at the same voltage', () => {
    const fromWh = estimateCharge({
      voltageV: 5,
      currentA: 2,
      capacityWh: 10,
      remainingPercent: 0,
    });
    const converted = capacityInWh(2000, 'mAh', 5);
    const fromMah = estimateCharge({
      voltageV: 5,
      currentA: 2,
      capacityWh: converted.capacityWh,
      remainingPercent: 0,
    });

    expect(converted).toEqual({ capacityWh: 10, needsVoltage: false });
    expect(fromMah).toEqual(fromWh);
  });

  it('leaves watt-hours unchanged and does not require voltage', () => {
    expect(capacityInWh(10, 'Wh', null)).toEqual({ capacityWh: 10, needsVoltage: false });
    expect(capacityInWh(null, 'Wh', null)).toEqual({
      capacityWh: null,
      needsVoltage: false,
    });
  });

  it('does not invent watt-hours when milliamp-hours have no usable voltage', () => {
    for (const voltage of [null, 0, -1]) {
      expect(capacityInWh(2000, 'mAh', voltage)).toEqual({
        capacityWh: null,
        needsVoltage: true,
      });
      expect(
        estimateCharge({
          voltageV: voltage,
          currentA: 2,
          capacityWh: null,
          remainingPercent: 0,
        }).hours,
      ).toBeNull();
    }
  });

  it('does not ask for voltage when milliamp-hours were left blank or negative', () => {
    expect(capacityInWh(null, 'mAh', null)).toEqual({
      capacityWh: null,
      needsVoltage: false,
    });
    expect(capacityInWh(-50, 'mAh', null)).toEqual({
      capacityWh: null,
      needsVoltage: false,
    });
  });
});

describe('formatDuration', () => {
  it('renders hours and minutes', () => {
    expect(formatDuration(1)).toBe('1 ч');
    expect(formatDuration(1.5)).toBe('1 ч 30 мин');
    expect(formatDuration(0.25)).toBe('15 мин');
  });
});

describe('parseNumber', () => {
  it('returns null for blank input', () => {
    expect(parseNumber('  ')).toBeNull();
    expect(parseNumber('2.5')).toBe(2.5);
  });
});
