import { describe, expect, it } from 'vitest';
import {
  CALCULATOR_STORAGE_KEY,
  EMPTY_CALCULATOR_DRAFT,
  loadCalculatorDraft,
  restoreCalculatorDraft,
  saveCalculatorDraft,
  serializeCalculatorDraft,
  type CalculatorDraft,
  type CalculatorStorage,
} from './calculatorStorage';

const filled: CalculatorDraft = {
  voltage: '5',
  current: '2',
  capacity: '10',
  remaining: '40',
  efficiency: '85',
  capacityUnit: 'Wh',
};

function memoryStorage(initial: Record<string, string> = {}): CalculatorStorage & {
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

describe('serializeCalculatorDraft', () => {
  it('writes every field, including ones the user cleared', () => {
    const raw = serializeCalculatorDraft({
      ...filled,
      remaining: '',
      efficiency: '',
    });

    expect(JSON.parse(raw)).toEqual({
      voltage: '5',
      current: '2',
      capacity: '10',
      remaining: '',
      efficiency: '',
      capacityUnit: 'Wh',
    });
  });
});

describe('restoreCalculatorDraft', () => {
  it('round-trips a saved draft', () => {
    expect(restoreCalculatorDraft(serializeCalculatorDraft(filled))).toEqual(filled);
  });

  it('keeps a cleared field empty', () => {
    const cleared = { ...filled, voltage: '', capacity: '' };
    expect(restoreCalculatorDraft(serializeCalculatorDraft(cleared))).toEqual(cleared);
  });

  it('falls back to empty defaults when storage is missing or blank', () => {
    expect(restoreCalculatorDraft(null)).toEqual(EMPTY_CALCULATOR_DRAFT);
    expect(restoreCalculatorDraft(undefined)).toEqual(EMPTY_CALCULATOR_DRAFT);
    expect(restoreCalculatorDraft('')).toEqual(EMPTY_CALCULATOR_DRAFT);
    expect(restoreCalculatorDraft('   ')).toEqual(EMPTY_CALCULATOR_DRAFT);
  });

  it('ignores corrupt JSON and non-objects', () => {
    for (const raw of ['{', 'not-json', 'null', '42', '"5"', '[]', 'true']) {
      expect(restoreCalculatorDraft(raw)).toEqual(EMPTY_CALCULATOR_DRAFT);
    }
  });

  it('keeps valid fields and blanks missing or non-string ones', () => {
    const raw = JSON.stringify({
      voltage: '12',
      current: 2,
      capacity: null,
      leftover: 'ignore-me',
    });

    expect(restoreCalculatorDraft(raw)).toEqual({
      voltage: '12',
      current: '',
      capacity: '',
      remaining: '',
      efficiency: '85',
      capacityUnit: 'Wh',
    });
  });

  it('restores a saved efficiency and falls back to 85% when it is missing', () => {
    expect(
      restoreCalculatorDraft(serializeCalculatorDraft({ ...filled, efficiency: '50' }))
        .efficiency,
    ).toBe('50');
    expect(restoreCalculatorDraft(JSON.stringify({ voltage: '5' })).efficiency).toBe(
      '85',
    );
    expect(
      restoreCalculatorDraft(serializeCalculatorDraft({ ...filled, efficiency: '' }))
        .efficiency,
    ).toBe('');
  });

  it('keeps mAh and falls back to Wh when the unit is missing or unrecognized', () => {
    const mah = { ...filled, capacityUnit: 'mAh' as const };
    expect(restoreCalculatorDraft(serializeCalculatorDraft(mah)).capacityUnit).toBe(
      'mAh',
    );

    for (const capacityUnit of [undefined, '', 'mah', 'MAH', 1, null]) {
      const raw = JSON.stringify({ ...filled, capacityUnit });
      expect(restoreCalculatorDraft(raw).capacityUnit).toBe('Wh');
    }
  });

  it('preserves a string exactly, including whitespace', () => {
    expect(restoreCalculatorDraft(JSON.stringify({ voltage: ' 5 ' })).voltage).toBe(
      ' 5 ',
    );
  });
});

describe('loadCalculatorDraft / saveCalculatorDraft', () => {
  it('saves under the calculator key and loads it back', () => {
    const storage = memoryStorage();
    saveCalculatorDraft(storage, filled);

    expect(storage.data[CALCULATOR_STORAGE_KEY]).toBe(serializeCalculatorDraft(filled));
    expect(loadCalculatorDraft(storage)).toEqual(filled);
  });

  it('loads empty defaults when the key is missing or corrupt', () => {
    expect(loadCalculatorDraft(memoryStorage())).toEqual(EMPTY_CALCULATOR_DRAFT);
    expect(
      loadCalculatorDraft(memoryStorage({ [CALCULATOR_STORAGE_KEY]: '{oops' })),
    ).toEqual(EMPTY_CALCULATOR_DRAFT);
  });

  it('does not throw when storage is missing or rejects access', () => {
    const blocked: CalculatorStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };

    expect(loadCalculatorDraft(null)).toEqual(EMPTY_CALCULATOR_DRAFT);
    expect(loadCalculatorDraft(blocked)).toEqual(EMPTY_CALCULATOR_DRAFT);
    expect(() => saveCalculatorDraft(null, filled)).not.toThrow();
    expect(() => saveCalculatorDraft(blocked, filled)).not.toThrow();
  });
});
