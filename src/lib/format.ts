import type { Prisma } from "@prisma/client";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function formatEuro(value: Prisma.Decimal | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return eur.format(Number(value));
}

export const PAYMENT_METHODS = { CONTANTI: "Contanti", BONIFICO: "Bonifico", POS: "POS", ALTRO: "Altro" } as const;
export const PAYMENT_REASONS = { QUOTA_ASSOCIATIVA: "Quota associativa", CORSO: "Corso", ALTRO: "Altro" } as const;
export const ENROLLMENT_STATUS = { ATTIVA: "Attiva", SOSPESA: "Sospesa", TERMINATA: "Terminata" } as const;
export const CERTIFICATE_TYPES = { NON_AGONISTICO: "Non agonistico", AGONISTICO: "Agonistico" } as const;
export const ROLES = { ADMIN: "Admin", INSTRUCTOR: "Istruttore" } as const;

export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.lastName} ${p.firstName}`;
}
