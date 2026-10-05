// Utility per leggere i campi dei form nelle server action.

export type ActionState = { error?: string; ok?: string } | undefined;

export function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

/** Importo in euro ("40" o "40,50"); null se vuoto, NaN se non valido. */
export function parsePrice(form: FormData, key: string): number | null {
  const v = str(form, key).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return n >= 0 ? n : NaN;
}

export function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}
