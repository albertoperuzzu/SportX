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

export async function startSession(user: Pick<User, "id" | "role" | "mustChangePassword">) {
  const token = await signSession({ uid: user.id, role: user.role, mcp: user.mustChangePassword });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Utente loggato (verificato sul DB), oppure null. */
export async function getCurrentUser() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.active) return null;
  return user;
}

/** Richiede un utente loggato (e opzionalmente admin); altrimenti redirect. */
export async function requireUser(opts: { admin?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/cambia-password");
  if (opts.admin && user.role !== "ADMIN") redirect("/calendario");
  return user;
}

export function requireAdmin() {
  return requireUser({ admin: true });
}
