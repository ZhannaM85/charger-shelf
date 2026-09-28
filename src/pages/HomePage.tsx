import { PlugZap } from 'lucide-react';
import { ChargeCalculator } from '../components/ChargeCalculator';

export function HomePage() {
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
      <ChargeCalculator />
    </main>
  );
}
