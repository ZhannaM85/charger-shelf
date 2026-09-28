import { PlugZap } from 'lucide-react';
import { useState } from 'react';
import { ChargeCalculator } from '../components/ChargeCalculator';
import { ChargerCompare } from '../components/ChargerCompare';
import { ChargerShelf } from '../components/ChargerShelf';
import { readBrowserStorage } from '../lib/calculatorStorage';
import { chargerInputValue, loadChargerShelf } from '../lib/chargerShelf';
import { useCalculatorDraft } from '../lib/useCalculatorDraft';

export function HomePage() {
  const { draft, setField, setCapacityUnit, applyPower } = useCalculatorDraft();
  const [chargers, setChargers] = useState(() => loadChargerShelf(readBrowserStorage()));

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col bg-stone-100 px-4 py-10 text-stone-900">
      <header className="mb-8 flex items-start gap-3">
        <span className="rounded-2xl bg-amber-800 p-3 text-amber-50">
          <PlugZap className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Полка зарядок</h1>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Оценка времени зарядки по напряжению, току и ёмкости аккумулятора.
          </p>
        </div>
      </header>
      <ChargeCalculator
        draft={draft}
        onFieldChange={setField}
        onCapacityUnitChange={setCapacityUnit}
      />
      <div className="mt-8">
        <ChargerShelf
          voltage={draft.voltage}
          current={draft.current}
          onChargersChange={setChargers}
          onApply={(charger) =>
            applyPower(
              chargerInputValue(charger.voltage),
              chargerInputValue(charger.current),
            )
          }
        />
      </div>
      <div className="mt-8">
        <ChargerCompare draft={draft} chargers={chargers} />
      </div>
    </main>
  );
}
