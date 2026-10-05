// Le date "solo giorno" sono salvate come mezzanotte UTC: tutte le conversioni passano da qui.

const TZ = "Europe/Rome";

/** "2026-10-05" -> Date (mezzanotte UTC) */
export function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Date -> "2026-10-05" */
export function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Data di oggi in Italia come "yyyy-MM-dd". */
export function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function today(): Date {
  return parseDay(todayString());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** 1 = lunedì ... 7 = domenica */
export function isoWeekday(date: Date): number {
  const d = date.getUTCDay();
  return d === 0 ? 7 : d;
}

export function startOfWeek(date: Date): Date {
  return addDays(date, 1 - isoWeekday(date));
}

const fmtDate = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const fmtLong = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const fmtShort = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "numeric", month: "short" });

export function formatDate(date: Date | null | undefined): string {
  return date ? fmtDate.format(date) : "—";
}

export function formatLongDate(date: Date): string {
  return fmtLong.format(date);
}

export function formatShortDate(date: Date): string {
  return fmtShort.format(date);
}

export const WEEKDAYS = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
export const WEEKDAYS_SHORT = ["", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
