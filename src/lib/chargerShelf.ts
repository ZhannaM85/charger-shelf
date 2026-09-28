import { parseNumber } from './chargeTime';

/**
 * Named chargers on this device (`localStorage` only, not synced).
 *
 * A missing key, or a value that is not a JSON array, is the first launch:
 * three USB presets the user can rename or delete. An array, including `[]`,
 * is the saved shelf and is not re-seeded — an empty shelf stays empty.
 */

export const CHARGER_SHELF_STORAGE_KEY = 'charger-shelf.chargers';
export const MAX_CHARGER_NAME_LENGTH = 60;

export type Charger = {
  id: string;
  name: string;
  voltage: number;
  current: number;
};

export const SEEDED_CHARGERS: readonly Charger[] = [
  { id: 'seed-usb-5v-1a', name: 'USB 5 В / 1 А', voltage: 5, current: 1 },
  { id: 'seed-usb-5v-2a', name: 'USB 5 В / 2 А', voltage: 5, current: 2 },
  { id: 'seed-usb-9v-2a', name: 'USB 9 В / 2 А', voltage: 9, current: 2 },
];

export type ChargerShelfStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type ChargerFieldInput = {
  name: string;
  voltage: string;
  current: string;
};

export type ChargerInputIssue = 'name' | 'name-length' | 'voltage' | 'current';

export type ChargerInputResult =
  | { ok: true; name: string; voltage: number; current: number }
  | { ok: false; issues: ChargerInputIssue[] };

export function seededChargers(): Charger[] {
  return SEEDED_CHARGERS.map((charger) => ({ ...charger }));
}

/** Round to 0.001 so 5.1 stays 5.1 and binary dust does not reach the inputs. */
export function roundChargerNumber(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function chargerInputValue(value: number): string {
  return String(roundChargerNumber(value));
}

export function formatChargerSpec(charger: Pick<Charger, 'voltage' | 'current'>): string {
  return `${chargerInputValue(charger.voltage)} В · ${chargerInputValue(charger.current)} А`;
}

export function sameChargerPower(
  voltageRaw: string,
  currentRaw: string,
  charger: Pick<Charger, 'voltage' | 'current'>,
): boolean {
  const voltage = parseNumber(voltageRaw);
  const current = parseNumber(currentRaw);
  if (voltage === null || current === null) return false;
  return (
    roundChargerNumber(voltage) === charger.voltage &&
    roundChargerNumber(current) === charger.current
  );
}

function positiveChargerNumber(raw: string): number | null {
  const parsed = parseNumber(raw);
  if (parsed === null || parsed <= 0) return null;
  const rounded = roundChargerNumber(parsed);
  return rounded > 0 ? rounded : null;
}

export function readChargerInput(input: ChargerFieldInput): ChargerInputResult {
  const issues: ChargerInputIssue[] = [];
  const name = input.name.trim();
  if (name === '') issues.push('name');
  else if ([...name].length > MAX_CHARGER_NAME_LENGTH) issues.push('name-length');

  const voltage = positiveChargerNumber(input.voltage);
  const current = positiveChargerNumber(input.current);
  if (voltage === null) issues.push('voltage');
  if (current === null) issues.push('current');
  if (issues.length > 0 || voltage === null || current === null)
    return { ok: false, issues };

  return { ok: true, name, voltage, current };
}

export function createChargerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `charger-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function restoreCharger(value: unknown): Charger | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.trim() === '') return null;
  if (typeof record.name !== 'string') return null;
  const name = record.name.trim();
  if (name === '' || [...name].length > MAX_CHARGER_NAME_LENGTH) return null;
  if (typeof record.voltage !== 'number' || typeof record.current !== 'number')
    return null;
  const voltage = positiveChargerNumber(String(record.voltage));
  const current = positiveChargerNumber(String(record.current));
  if (voltage === null || current === null) return null;
  return { id: record.id, name, voltage, current };
}

/**
 * `null` means "not a saved shelf" (missing or corrupt) so the caller can seed.
 * An array, even empty, is a real shelf.
 */
export function restoreChargerShelf(raw: string | null | undefined): Charger[] | null {
  if (raw == null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const chargers: Charger[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    const charger = restoreCharger(item);
    if (!charger || seen.has(charger.id)) continue;
    seen.add(charger.id);
    chargers.push(charger);
  }
  return chargers;
}

export function serializeChargerShelf(chargers: readonly Charger[]): string {
  return JSON.stringify(
    chargers.map((charger) => ({
      id: charger.id,
      name: charger.name,
      voltage: charger.voltage,
      current: charger.current,
    })),
  );
}

export function loadChargerShelf(
  storage: ChargerShelfStorage | null | undefined,
): Charger[] {
  if (!storage) return seededChargers();
  try {
    const raw = storage.getItem(CHARGER_SHELF_STORAGE_KEY);
    if (raw == null) return seededChargers();
    return restoreChargerShelf(raw) ?? seededChargers();
  } catch {
    return seededChargers();
  }
}

export function saveChargerShelf(
  storage: ChargerShelfStorage | null | undefined,
  chargers: readonly Charger[],
): void {
  if (!storage) return;
  try {
    storage.setItem(CHARGER_SHELF_STORAGE_KEY, serializeChargerShelf(chargers));
  } catch {
    // Private mode or quota: keep the in-memory list.
  }
}
