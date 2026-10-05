"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, INITIAL_PASSWORD, requireAdmin } from "@/lib/auth";
import { optStr, str, type ActionState } from "@/lib/forms";

const userSchema = z.object({
  email: z.email("Email non valida."),
  firstName: z.string().min(1, "Nome obbligatorio."),
  lastName: z.string().min(1, "Cognome obbligatorio."),
  phone: z.string().nullable(),
  role: z.enum(["ADMIN", "INSTRUCTOR"]),
});

function parseUser(form: FormData) {
  return userSchema.safeParse({
    email: str(form, "email").toLowerCase(),
    firstName: str(form, "firstName"),
    lastName: str(form, "lastName"),
    phone: optStr(form, "phone"),
    role: str(form, "role"),
  });
}

export async function createUser(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseUser(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) {
    return { error: "Esiste già un utente con questa email." };
  }
  await prisma.user.create({
    data: { ...parsed.data, passwordHash: await hashPassword(INITIAL_PASSWORD), mustChangePassword: true },
  });
  revalidatePath("/admin/utenti");
  return { ok: `Utente creato. Primo accesso con la password ${INITIAL_PASSWORD}` };
}

export async function updateUser(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const id = str(form, "id");
  const parsed = parseUser(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (id === me.id && parsed.data.role !== "ADMIN") return { error: "Non puoi togliere a te stesso il ruolo di admin." };
  const clash = await prisma.user.findFirst({ where: { email: parsed.data.email, NOT: { id } } });
  if (clash) return { error: "Esiste già un utente con questa email." };
  await prisma.user.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/utenti");
  return { ok: "Modifiche salvate." };
}

export async function resetPassword(form: FormData) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: str(form, "id") },
    data: { passwordHash: await hashPassword(INITIAL_PASSWORD), mustChangePassword: true },
  });
  revalidatePath("/admin/utenti");
}

export async function toggleActive(form: FormData) {
  const me = await requireAdmin();
  const id = str(form, "id");
  if (id === me.id) return;
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/admin/utenti");
}
