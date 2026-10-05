import { addDays, today } from "./dates";

export type CertStatus = "valido" | "in_scadenza" | "scaduto" | "mancante";

export const EXPIRING_DAYS = 30;

/** Stato del certificato più recente (per data di scadenza). */
export function certificateStatus(certs: { expiryDate: Date }[]): { status: CertStatus; expiry: Date | null } {
  if (certs.length === 0) return { status: "mancante", expiry: null };
  const expiry = certs.reduce((max, c) => (c.expiryDate > max ? c.expiryDate : max), certs[0].expiryDate);
  const now = today();
  if (expiry < now) return { status: "scaduto", expiry };
  if (expiry <= addDays(now, EXPIRING_DAYS)) return { status: "in_scadenza", expiry };
  return { status: "valido", expiry };
}
