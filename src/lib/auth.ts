import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";
import type { User } from "@prisma/client";

/** Password del primo accesso, da cambiare obbligatoriamente al login. */
export const INITIAL_PASSWORD = "SportX2026!";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * Avvia la sessione di `user`. Con `impersonatorId` l'admin indicato vede l'app come `user`:
 * in quel caso il cambio password obbligatorio non si applica.
 */
export async function startSession(user: Pick<User, "id" | "role" | "mustChangePassword">, impersonatorId?: string) {
  const token = await signSession({
    uid: user.id,
    role: user.role,
    mcp: impersonatorId ? false : user.mustChangePassword,
    ...(impersonatorId && { imp: impersonatorId }),
  });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Utente loggato (verificato sul DB), oppure null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.active) return null;
  // Una sessione "vedi come" vale solo finché l'admin che l'ha aperta è ancora un admin attivo.
  if (session.imp && !(await getImpersonator())) return null;
  return user;
}

/** L'admin che sta usando "vedi come", se la sessione corrente è un'impersonificazione valida. */
export async function getImpersonator() {
  const session = await getSession();
  if (!session?.imp) return null;
  const admin = await prisma.user.findUnique({ where: { id: session.imp } });
  return admin && admin.active && admin.role === "ADMIN" ? admin : null;
}

/** Richiede un utente loggato (e opzionalmente admin); altrimenti redirect. */
export async function requireUser(opts: { admin?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !(await getImpersonator())) redirect("/cambia-password");
  if (opts.admin && user.role !== "ADMIN") redirect("/calendario");
  return user;
}

export function requireAdmin() {
  return requireUser({ admin: true });
}
