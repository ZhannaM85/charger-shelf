import type { CapacityUnit } from './chargeTime';

/**
 * Last calculator inputs, stored only in this browser (`localStorage`).
 * Not synced across devices.
 *
 * Later backlog fields (efficiency and so on) belong in `CALCULATOR_FIELDS`.
 * A missing or non-string value restores as "".
 * A cleared field is stored as "" and stays cleared after reload.
 *
 * `capacityUnit` is stored with those fields: "Wh" (default) or "mAh".
 * A missing or unrecognized unit restores as "Wh".
 */

export const CALCULATOR_STORAGE_KEY = 'charger-shelf.calculator';

export const CALCULATOR_FIELDS = ['voltage', 'current', 'capacity', 'remaining'] as const;

export type CalculatorField = (typeof CALCULATOR_FIELDS)[number];

export type CalculatorDraft = Record<CalculatorField, string> & {
  capacityUnit: CapacityUnit;
};

export const EMPTY_CALCULATOR_DRAFT: CalculatorDraft = {
  voltage: '',
  current: '',
  capacity: '',
  remaining: '',
  capacityUnit: 'Wh',
};

export type CalculatorStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function serializeCalculatorDraft(draft: CalculatorDraft): string {
  const payload: CalculatorDraft = { ...EMPTY_CALCULATOR_DRAFT };
  for (const field of CALCULATOR_FIELDS) {
    payload[field] = draft[field];
  }
  payload.capacityUnit = draft.capacityUnit === 'mAh' ? 'mAh' : 'Wh';
  return JSON.stringify(payload);
}

export function restoreCalculatorDraft(raw: string | null | undefined): CalculatorDraft {
  if (raw == null || raw.trim() === '') return { ...EMPTY_CALCULATOR_DRAFT };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY_CALCULATOR_DRAFT };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...EMPTY_CALCULATOR_DRAFT };
  }

  const record = parsed as Record<string, unknown>;
  const draft: CalculatorDraft = { ...EMPTY_CALCULATOR_DRAFT };
  for (const field of CALCULATOR_FIELDS) {
    const value = record[field];
    if (typeof value === 'string') draft[field] = value;
  }
  draft.capacityUnit = record.capacityUnit === 'mAh' ? 'mAh' : 'Wh';
  return draft;
}

export function loadCalculatorDraft(
  storage: CalculatorStorage | null | undefined,
): CalculatorDraft {
  if (!storage) return { ...EMPTY_CALCULATOR_DRAFT };
  try {
    return restoreCalculatorDraft(storage.getItem(CALCULATOR_STORAGE_KEY));
  } catch {
    return { ...EMPTY_CALCULATOR_DRAFT };
  }
}

export function saveCalculatorDraft(
  storage: CalculatorStorage | null | undefined,
  draft: CalculatorDraft,
): void {
  if (!storage) return;
  try {
    storage.setItem(CALCULATOR_STORAGE_KEY, serializeCalculatorDraft(draft));
  } catch {
    // Private mode or quota: keep the in-memory values.
  }
}

export function readBrowserStorage(): CalculatorStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
