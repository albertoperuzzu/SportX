"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkPassword, endSession, getCurrentUser, hashPassword, startSession } from "@/lib/auth";
import { INITIAL_PASSWORD } from "@/lib/auth";
import { str, type ActionState } from "@/lib/forms";

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await checkPassword(password, user.passwordHash))) {
    return { error: "Email o password non corretti." };
  }
  await startSession(user);
  redirect(user.mustChangePassword ? "/cambia-password" : "/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri.")
  .refine((p) => p !== INITIAL_PASSWORD, "Scegli una password diversa da quella iniziale.");

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!(await checkPassword(current, user.passwordHash))) return { error: "La password attuale non è corretta." };
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (next !== confirm) return { error: "Le due password non coincidono." };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  await startSession(updated);
  redirect("/");
}
