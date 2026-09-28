import { estimateCharge, formatDuration, type ChargeEstimate } from './chargeTime';

export type CompareSide = 'first' | 'second';

export type CompareChargerInput = {
  voltageV: number | null;
  currentA: number | null;
};

export type CompareSideResult = {
  /** False when voltage or current was left blank. A blank side is not an estimate. */
  specified: boolean;
  estimate: ChargeEstimate;
};

export type ChargeComparison = {
  first: CompareSideResult;
  second: CompareSideResult;
  /** Strictly shorter time. Null on a tie, or when either side has no time. */
  faster: CompareSide | null;
  /** Absolute difference in hours when both sides have a time. Null otherwise. */
  deltaHours: number | null;
};

const EMPTY_ESTIMATE: ChargeEstimate = {
  powerW: null,
  energyWh: null,
  hours: null,
};

/** A charger counts only when both voltage and current were entered. */
export function isChargerSpecified(charger: CompareChargerInput): boolean {
  return charger.voltageV !== null && charger.currentA !== null;
}

function estimateSide(
  charger: CompareChargerInput,
  battery: {
    capacityWh: number | null;
    remainingPercent: number | null;
    efficiencyPercent?: number | null;
  },
): CompareSideResult {
  if (!isChargerSpecified(charger)) {
    return { specified: false, estimate: EMPTY_ESTIMATE };
  }

  return {
    specified: true,
    estimate: estimateCharge({
      voltageV: charger.voltageV,
      currentA: charger.currentA,
      capacityWh: battery.capacityWh,
      remainingPercent: battery.remainingPercent,
      efficiencyPercent: battery.efficiencyPercent,
    }),
  };
}

/**
 * Same battery (capacity, remaining %, efficiency) for both chargers.
 * A blank charger is skipped, including when the battery is already full:
 * that shortcut is 0 hours only for a charger that was actually entered.
 * Equal times are a tie (`faster` is null, `deltaHours` is 0).
 */
export function compareChargers(input: {
  capacityWh: number | null;
  remainingPercent: number | null;
  efficiencyPercent?: number | null;
  first: CompareChargerInput;
  second: CompareChargerInput;
}): ChargeComparison {
  const battery = {
    capacityWh: input.capacityWh,
    remainingPercent: input.remainingPercent,
    efficiencyPercent: input.efficiencyPercent,
  };
  const first = estimateSide(input.first, battery);
  const second = estimateSide(input.second, battery);
  const firstHours = first.specified ? first.estimate.hours : null;
  const secondHours = second.specified ? second.estimate.hours : null;

  if (firstHours === null || secondHours === null) {
    return { first, second, faster: null, deltaHours: null };
  }

  const deltaHours = Math.abs(firstHours - secondHours);
  if (firstHours === secondHours) {
    return { first, second, faster: null, deltaHours };
  }

  return {
    first,
    second,
    faster: firstHours < secondHours ? 'first' : 'second',
    deltaHours,
  };
}

/** Winner sentence, a tie, or null when there are not two times to order. */
export function formatComparisonSummary(comparison: ChargeComparison): string | null {
  if (comparison.deltaHours === null) return null;
  if (comparison.faster === null) return 'Одинаковое время';
  const label = comparison.faster === 'first' ? 'Первая' : 'Вторая';
  return `${label} быстрее на ${formatDuration(comparison.deltaHours)}`;
}
