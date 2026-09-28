import { describe, expect, it } from 'vitest';
import {
  CHARGER_SHELF_STORAGE_KEY,
  SEEDED_CHARGERS,
  loadChargerShelf,
  readChargerInput,
  restoreChargerShelf,
  saveChargerShelf,
  seededChargers,
  serializeChargerShelf,
  type Charger,
  type ChargerShelfStorage,
} from './chargerShelf';

const notebook: Charger = {
  id: 'notebook',
  name: 'Ноутбук',
  voltage: 20,
  current: 3.25,
};

function memoryStorage(initial: Record<string, string> = {}): ChargerShelfStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('charger shelf seeds', () => {
  it('starts from the USB presets and does not share the seed array', () => {
    const first = seededChargers();
    first[0].name = 'changed';
    expect(seededChargers().map((charger) => charger.name)).toEqual(
      SEEDED_CHARGERS.map((charger) => charger.name),
    );
    expect(seededChargers().map((charger) => [charger.voltage, charger.current])).toEqual(
      [
        [5, 1],
        [5, 2],
        [9, 2],
      ],
    );
  });
});

describe('readChargerInput', () => {
  it('trims the name and keeps a positive voltage and current', () => {
    expect(
      readChargerInput({ name: '  Ноутбук  ', voltage: '20', current: '3.25' }),
    ).toEqual({
      ok: true,
      name: 'Ноутбук',
      voltage: 20,
      current: 3.25,
    });
  });

  it('rejects a blank name, a too-long name, and a voltage or current that is not above 0', () => {
    expect(readChargerInput({ name: '   ', voltage: '', current: '' })).toEqual({
      ok: false,
      issues: ['name', 'voltage', 'current'],
    });
    expect(readChargerInput({ name: 'Блок', voltage: '0', current: '-1' })).toMatchObject(
      {
        ok: false,
        issues: ['voltage', 'current'],
      },
    );
    expect(
      readChargerInput({ name: 'я'.repeat(61), voltage: '5', current: '1' }),
    ).toEqual({
      ok: false,
      issues: ['name-length'],
    });
    expect(
      readChargerInput({ name: 'я'.repeat(60), voltage: '5', current: '1' }),
    ).toMatchObject({ ok: true, name: 'я'.repeat(60) });
  });
});

describe('restoreChargerShelf', () => {
  it('round-trips a saved shelf and keeps an empty list empty', () => {
    expect(restoreChargerShelf(serializeChargerShelf([notebook]))).toEqual([notebook]);
    expect(restoreChargerShelf('[]')).toEqual([]);
  });

  it('returns null for a missing or corrupt value so the caller can seed', () => {
    for (const raw of [null, undefined, '', '   ', '{', 'null', '{}', '"usb"']) {
      expect(restoreChargerShelf(raw)).toBeNull();
    }
  });

  it('drops invalid rows and a repeated id', () => {
    const raw = JSON.stringify([
      notebook,
      { id: 'bad-voltage', name: 'Ноль', voltage: 0, current: 1 },
      { id: '', name: 'Без id', voltage: 5, current: 1 },
      { name: 'Без id', voltage: 5, current: 1 },
      { id: 'text', name: 'Текст', voltage: '5', current: 1 },
      { id: notebook.id, name: 'Дубль', voltage: 12, current: 1 },
      { id: 'long', name: 'я'.repeat(61), voltage: 5, current: 1 },
    ]);

    expect(restoreChargerShelf(raw)).toEqual([notebook]);
  });
});

describe('loadChargerShelf / saveChargerShelf', () => {
  it('seeds when the key is missing and saves a later edit under that key', () => {
    const storage = memoryStorage();
    expect(loadChargerShelf(storage)).toEqual(seededChargers());

    saveChargerShelf(storage, [notebook]);
    expect(storage.data[CHARGER_SHELF_STORAGE_KEY]).toBe(
      serializeChargerShelf([notebook]),
    );
    expect(loadChargerShelf(storage)).toEqual([notebook]);
  });

  it('does not reseed an empty shelf or a corrupt value that was replaced by seeds only when unreadable', () => {
    const empty = memoryStorage({ [CHARGER_SHELF_STORAGE_KEY]: '[]' });
    expect(loadChargerShelf(empty)).toEqual([]);

    const corrupt = memoryStorage({ [CHARGER_SHELF_STORAGE_KEY]: '{oops' });
    expect(loadChargerShelf(corrupt)).toEqual(seededChargers());
  });

  it('does not throw when storage is missing or rejects access', () => {
    const blocked: ChargerShelfStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };

    expect(loadChargerShelf(null)).toEqual(seededChargers());
    expect(loadChargerShelf(blocked)).toEqual(seededChargers());
    expect(() => saveChargerShelf(null, [notebook])).not.toThrow();
    expect(() => saveChargerShelf(blocked, [notebook])).not.toThrow();
  });
});
