// Regole degli abbonamenti. Modulo "puro" (niente DB): usabile anche lato client.
import { addDays, formatDate } from "./dates";

export type SubscriptionType = "MENSILE" | "TRIMESTRALE" | "ANNUALE" | "CARNET";

export const SUBSCRIPTION_TYPES: Record<SubscriptionType, string> = {
  MENSILE: "Mensile",
  TRIMESTRALE: "Trimestrale",
  ANNUALE: "Annuale",
  CARNET: "Carnet",
};

export const SUBSCRIPTION_RULES: Record<SubscriptionType, string> = {
  MENSILE: "4 settimane dalla data di inizio",
  TRIMESTRALE: "12 settimane dalla data di inizio",
  ANNUALE: "fino al 30 giugno",
  CARNET: "10 ingressi, entro il 28 febbraio",
};

export const CARNET_ENTRIES = 10;

/** Giorni prima della scadenza in cui un abbonamento a tempo è "in scadenza". */
export const EXPIRING_SUB_DAYS = 7;

/** Prossima occorrenza (>= start) di un giorno/mese fisso, es. 30 giugno. */
function nextFixedDate(start: Date, month: number, day: number): Date {
  const year = start.getUTCFullYear();
  const sameYear = new Date(Date.UTC(year, month - 1, day));
  return sameYear >= start ? sameYear : new Date(Date.UTC(year + 1, month - 1, day));
}

/** Data di fine (inclusa) calcolata dalla data di inizio. */
export function computeEndDate(type: SubscriptionType, start: Date): Date {
  switch (type) {
    case "MENSILE":
      return addDays(start, 4 * 7 - 1);
    case "TRIMESTRALE":
      return addDays(start, 12 * 7 - 1);
    case "ANNUALE":
      return nextFixedDate(start, 6, 30);
    case "CARNET":
      return nextFixedDate(start, 2, 28);
  }
}

export type Sub = { id: string; type: SubscriptionType; startDate: Date; endDate: Date; entries: number | null };
export type Att = { id: string; date: Date };

export type SubStatusKind = "attivo" | "in_scadenza" | "esaurito" | "scaduto" | "nessuno";

export type SubStatus = {
  kind: SubStatusKind;
  label: string;
  /** Ingressi usati per ogni carnet (id abbonamento -> usati) */
  carnetUsage: Map<string, number>;
  /** Presenze non coperte da nessun abbonamento */
  uncovered: number;
};

/**
 * Assegna ogni presenza a un abbonamento e calcola lo stato alla data `at`.
 * Le presenze nei periodi coperti da un abbonamento a tempo non consumano il carnet;
 * le altre consumano i carnet validi in ordine di acquisto.
 * `currentAttId` è la presenza della lezione che si sta guardando (conta come coperta anche se è l'ultimo ingresso).
 */
export function subscriptionStatus(subs: Sub[], atts: Att[], at: Date, currentAttId?: string): SubStatus {
  const timed = subs.filter((s) => s.type !== "CARNET");
  const carnets = subs.filter((s) => s.type === "CARNET").sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const usage = new Map(carnets.map((c) => [c.id, 0]));
  const coveredBy = new Map<string, string>();
  let uncovered = 0;

  for (const a of [...atts].sort((x, y) => x.date.getTime() - y.date.getTime())) {
    const t = timed.find((s) => s.startDate <= a.date && a.date <= s.endDate);
    if (t) {
      coveredBy.set(a.id, t.id);
      continue;
    }
    const c = carnets.find(
      (s) => s.startDate <= a.date && a.date <= s.endDate && usage.get(s.id)! < (s.entries ?? CARNET_ENTRIES),
    );
    if (c) {
      usage.set(c.id, usage.get(c.id)! + 1);
      coveredBy.set(a.id, c.id);
    } else uncovered++;
  }

  const base = { carnetUsage: usage, uncovered };

  const activeTimed = timed
    .filter((s) => s.startDate <= at && at <= s.endDate)
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];
  if (activeTimed) {
    const expiring = activeTimed.endDate <= addDays(at, EXPIRING_SUB_DAYS);
    return {
      ...base,
      kind: expiring ? "in_scadenza" : "attivo",
      label: `${SUBSCRIPTION_TYPES[activeTimed.type]} fino al ${formatDate(activeTimed.endDate)}`,
    };
  }

  const validCarnets = carnets.filter((s) => s.startDate <= at && at <= s.endDate);
  const currentCarnet = currentAttId ? coveredBy.get(currentAttId) : undefined;
  const carnet =
    validCarnets.find((c) => c.id === currentCarnet) ??
    validCarnets.find((c) => usage.get(c.id)! < (c.entries ?? CARNET_ENTRIES));
  if (carnet) {
    const total = carnet.entries ?? CARNET_ENTRIES;
    const left = total - usage.get(carnet.id)!;
    return {
      ...base,
      kind: left <= 1 ? "in_scadenza" : "attivo",
      label: `Carnet: ${left === 0 ? "ultimo ingresso usato" : `${left}/${total} ingressi rimasti`} (scade ${formatDate(carnet.endDate)})`,
    };
  }
  if (validCarnets.length > 0) return { ...base, kind: "esaurito", label: "Carnet esaurito" };

  if (subs.length > 0) {
    const last = subs.reduce((m, s) => (s.endDate > m.endDate ? s : m), subs[0]);
    if (last.startDate > at) return { ...base, kind: "scaduto", label: `Nuovo abbonamento dal ${formatDate(last.startDate)}` };
    return { ...base, kind: "scaduto", label: `Abbonamento scaduto il ${formatDate(last.endDate)}` };
  }
  return { ...base, kind: "nessuno", label: "Nessun abbonamento" };
}

export function needsRenewal(kind: SubStatusKind) {
  return kind !== "attivo";
}
