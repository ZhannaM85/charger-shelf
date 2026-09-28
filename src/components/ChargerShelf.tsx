import { useEffect, useState, type FormEvent } from 'react';
import {
  createChargerId,
  formatChargerSpec,
  loadChargerShelf,
  readChargerInput,
  sameChargerPower,
  saveChargerShelf,
  type Charger,
  type ChargerInputIssue,
} from '../lib/chargerShelf';
import { readBrowserStorage } from '../lib/calculatorStorage';

const ISSUE_TEXT: Record<ChargerInputIssue, string> = {
  name: 'Введите название.',
  'name-length': 'Название не длиннее 60 символов.',
  voltage: 'Укажите напряжение больше 0.',
  current: 'Укажите ток больше 0.',
};

type ChargerShelfProps = {
  voltage: string;
  current: string;
  onApply: (charger: Charger) => void;
  onChargersChange: (chargers: Charger[]) => void;
};

const fieldClassName =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none ring-amber-700 focus:ring-2';

function applyLabel(charger: Charger): string {
  return `${charger.name}, подставить ${formatChargerSpec(charger)}`;
}

export function ChargerShelf({
  voltage,
  current,
  onApply,
  onChargersChange,
}: ChargerShelfProps) {
  const [chargers, setChargers] = useState<Charger[]>(() =>
    loadChargerShelf(readBrowserStorage()),
  );
  const [name, setName] = useState('');
  const [voltageField, setVoltageField] = useState('');
  const [currentField, setCurrentField] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [issues, setIssues] = useState<ChargerInputIssue[]>([]);

  useEffect(() => {
    saveChargerShelf(readBrowserStorage(), chargers);
    onChargersChange(chargers);
  }, [chargers, onChargersChange]);

  const editing = editingId !== null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setVoltageField('');
    setCurrentField('');
    setIssues([]);
  };

  const startEdit = (charger: Charger) => {
    setEditingId(charger.id);
    setName(charger.name);
    setVoltageField(String(charger.voltage));
    setCurrentField(String(charger.current));
    setIssues([]);
  };

  const remove = (id: string) => {
    setChargers((current) => current.filter((charger) => charger.id !== id));
    if (editingId === id) resetForm();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = readChargerInput({
      name,
      voltage: voltageField,
      current: currentField,
    });
    if (!parsed.ok) {
      setIssues(parsed.issues);
      return;
    }

    const next = {
      name: parsed.name,
      voltage: parsed.voltage,
      current: parsed.current,
    };
    const id = editingId ?? createChargerId();
    setChargers((current) => {
      if (editingId !== null) {
        return current.map((charger) =>
          charger.id === editingId ? { ...charger, ...next } : charger,
        );
      }
      if (current.some((charger) => charger.id === id)) return current;
      return [...current, { id, ...next }];
    });
    resetForm();
  };

  return (
    <section
      aria-labelledby="charger-shelf-heading"
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <h2 id="charger-shelf-heading" className="text-lg font-semibold tracking-tight">
        Полка
      </h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        Нажмите зарядку — в калькулятор подставятся напряжение и ток.
      </p>

      {chargers.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          Пока пусто. Напряжение и ток можно ввести вручную.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2" aria-label="Сохранённые зарядки">
          {chargers.map((charger) => {
            const selected = sameChargerPower(voltage, current, charger);
            return (
              <li
                key={charger.id}
                className={
                  selected
                    ? 'rounded-xl border border-amber-700 bg-amber-50 px-3 py-2'
                    : 'rounded-xl border border-stone-200 bg-stone-50 px-3 py-2'
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={applyLabel(charger)}
                    onClick={() => onApply(charger)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate font-medium text-stone-900">
                      {charger.name}
                    </span>
                    <span className="mt-0.5 block text-sm tabular-nums text-stone-500">
                      {formatChargerSpec(charger)}
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-2 pt-0.5">
                    <button
                      type="button"
                      aria-label={`Изменить ${charger.name}`}
                      onClick={() => startEdit(charger)}
                      className="text-sm text-stone-600"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      aria-label={`Удалить ${charger.name}`}
                      onClick={() => remove(charger.id)}
                      className="text-sm text-red-800"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="mt-5 grid gap-3" onSubmit={submit}>
        <h3 className="text-sm font-medium text-stone-800">
          {editing ? 'Изменить зарядку' : 'Новая зарядка'}
        </h3>
        <div>
          <label
            htmlFor="shelf-name"
            className="block text-sm font-medium text-stone-800"
          >
            Название
          </label>
          <input
            id="shelf-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`mt-1.5 ${fieldClassName}`}
          />
          {issues.includes('name') || issues.includes('name-length') ? (
            <p className="mt-1 text-xs text-red-700">
              {issues.includes('name') ? ISSUE_TEXT.name : ISSUE_TEXT['name-length']}
            </p>
          ) : null}
        </div>
        <ShelfNumberField
          id="shelf-voltage"
          label="Напряжение зарядки"
          unit="В"
          value={voltageField}
          onChange={setVoltageField}
          error={issues.includes('voltage') ? ISSUE_TEXT.voltage : undefined}
        />
        <ShelfNumberField
          id="shelf-current"
          label="Ток зарядки"
          unit="А"
          value={currentField}
          onChange={setCurrentField}
          error={issues.includes('current') ? ISSUE_TEXT.current : undefined}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-medium text-amber-50"
          >
            {editing ? 'Сохранить' : 'Добавить'}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg px-3 py-2 text-sm text-stone-600"
            >
              Отмена
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function ShelfNumberField({
  id,
  label,
  unit,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClassName}
        />
        <span className="w-6 shrink-0 text-sm text-stone-500">{unit}</span>
      </div>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
