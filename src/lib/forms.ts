// Utility per leggere i campi dei form nelle server action.

export type ActionState = { error?: string; ok?: string } | undefined;

export function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

export function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}
