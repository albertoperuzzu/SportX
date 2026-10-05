"use client";

import { useState } from "react";

type Person = { id: string; name: string; present: boolean; warnings: string[]; info?: string; incomplete?: boolean };

/** Elenco presenti/assenti con toggle grandi, pensato per l'uso da telefono. */
export function AttendanceList({ people }: { people: Person[] }) {
  const [present, setPresent] = useState(() => new Set(people.filter((p) => p.present).map((p) => p.id)));

  const toggle = (id: string) =>
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span>
          <strong>{present.size}</strong> presenti su {people.length}
        </span>
        <span className="flex gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => setPresent(new Set(people.map((p) => p.id)))}>
            Tutti presenti
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setPresent(new Set())}>
            Azzera
          </button>
        </span>
      </div>
      <ul className="space-y-2">
        {people.map((p) => {
          const on = present.has(p.id);
          return (
            <li key={p.id}>
              <input type="hidden" name="member" value={p.id} />
              {on && <input type="hidden" name="present" value={p.id} />}
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
                  on ? "border-brand-green bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <span>
                  <span className="font-semibold">{p.name}</span>
                  {p.incomplete && <span className="ml-2 text-xs text-amber-700">(nuovo)</span>}
                  {p.warnings.map((w) => (
                    <span key={w} className="block text-xs text-red-600">
                      ⚠ {w}
                    </span>
                  ))}
                  {p.info && <span className="block text-xs text-slate-500">{p.info}</span>}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${on ? "bg-brand-green text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {on ? "PRESENTE" : "ASSENTE"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
