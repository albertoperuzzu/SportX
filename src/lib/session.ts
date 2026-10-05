// Gestione del cookie di sessione (JWT firmato). Usabile anche nel middleware (edge runtime).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sportx_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 giorni

export type Role = "ADMIN" | "INSTRUCTOR";

export type SessionPayload = {
  uid: string;
  role: Role;
  /** true finché l'utente non ha scelto una password personale */
  mcp: boolean;
  /** Se presente: id dell'admin che sta visualizzando l'app come questo utente ("vedi come") */
  imp?: string;
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET non configurato");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
