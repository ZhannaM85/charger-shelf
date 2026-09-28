import { useEffect, useState } from 'react';
import type { CapacityUnit } from './chargeTime';
import {
  loadCalculatorDraft,
  readBrowserStorage,
  saveCalculatorDraft,
  type CalculatorDraft,
  type CalculatorField,
} from './calculatorStorage';

export function useCalculatorDraft(): {
  draft: CalculatorDraft;
  setField: (field: CalculatorField, value: string) => void;
  setCapacityUnit: (unit: CapacityUnit) => void;
  applyPower: (voltage: string, current: string) => void;
} {
  const [draft, setDraft] = useState<CalculatorDraft>(() =>
    loadCalculatorDraft(readBrowserStorage()),
  );

  useEffect(() => {
    saveCalculatorDraft(readBrowserStorage(), draft);
  }, [draft]);

  const setField = (field: CalculatorField, value: string) => {
    setDraft((draft) => ({ ...draft, [field]: value }));
  };

  const setCapacityUnit = (capacityUnit: CapacityUnit) => {
    setDraft((draft) => ({ ...draft, capacityUnit }));
  };

  // Voltage and current only. Capacity, remaining, efficiency, and unit stay.
  // The updater argument must not be named `current`: that name is also a field.
  const applyPower = (voltage: string, current: string) => {
    setDraft((draft) => ({ ...draft, voltage, current }));
  };

  return { draft, setField, setCapacityUnit, applyPower };
}
