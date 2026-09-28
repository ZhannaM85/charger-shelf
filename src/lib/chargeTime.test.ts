import { describe, expect, it } from 'vitest';
import { estimateCharge, formatDuration, parseNumber } from './chargeTime';

describe('estimateCharge', () => {
  it('divides watt-hours still needed by volts times amps', () => {
    const estimate = estimateCharge({
      voltageV: 5,
      currentA: 2,
      capacityWh: 10,
      remainingPercent: 0,
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
    });

    expect(estimate.hours).toBe(2);
  });

  it('uses only the unfilled share of capacity', () => {
    const estimate = estimateCharge({
      voltageV: 10,
      currentA: 1,
      capacityWh: 20,
      remainingPercent: 75,
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
