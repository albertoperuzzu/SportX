"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDay } from "@/lib/dates";
import { bool, optStr, str, type ActionState } from "@/lib/forms";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida.");

function parseMember(form: FormData) {
  const parsed = z
    .object({
      firstName: z.string().min(1, "Il nome è obbligatorio."),
      lastName: z.string().min(1, "Il cognome è obbligatorio."),
      email: z.email("Email non valida.").nullable(),
      birthDate: day.nullable(),
      fiscalCode: z
        .string()
        .regex(/^[A-Z0-9]{16}$/, "Il codice fiscale deve avere 16 caratteri.")
        .nullable(),
    })
    .safeParse({
      firstName: str(form, "firstName"),
      lastName: str(form, "lastName"),
      email: optStr(form, "email")?.toLowerCase() ?? null,
      birthDate: optStr(form, "birthDate"),
      fiscalCode: optStr(form, "fiscalCode")?.toUpperCase() ?? null,
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  return {
    data: {
      ...parsed.data,
      birthDate: parsed.data.birthDate ? parseDay(parsed.data.birthDate) : null,
      phone: optStr(form, "phone"),
      birthPlace: optStr(form, "birthPlace"),
      address: optStr(form, "address"),
      city: optStr(form, "city"),
      zip: optStr(form, "zip"),
      cardNumber: optStr(form, "cardNumber"),
      notes: optStr(form, "notes"),
    },
  } as const;
}

export async function createMember(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const res = parseMember(form);
  if ("error" in res) return { error: res.error };
  const courseId = optStr(form, "courseId");
  const member = await prisma.member.create({
    data: {
      ...res.data,
      createdById: me.id,
      enrollments: courseId ? { create: { courseId } } : undefined,
    },
  });
  redirect(`/admin/iscritti/${member.id}`);
}

export async function updateMember(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  const res = parseMember(form);
  if ("error" in res) return { error: res.error };
  await prisma.member.update({ where: { id }, data: { ...res.data, incomplete: bool(form, "incomplete") } });
  revalidatePath(`/admin/iscritti/${id}`);
  return { ok: "Anagrafica salvata." };
}

export async function deleteMember(form: FormData) {
  await requireAdmin();
  await prisma.member.delete({ where: { id: str(form, "id") } });
  redirect("/admin/iscritti");
}

export async function addCertificate(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const memberId = str(form, "memberId");
  const parsed = z
    .object({ type: z.enum(["NON_AGONISTICO", "AGONISTICO"]), issueDate: day.nullable(), expiryDate: day })
    .safeParse({ type: str(form, "type"), issueDate: optStr(form, "issueDate"), expiryDate: str(form, "expiryDate") });
  if (!parsed.success) return { error: "Indica almeno la data di scadenza." };
  await prisma.medicalCertificate.create({
    data: {
      memberId,
      type: parsed.data.type,
      issueDate: parsed.data.issueDate ? parseDay(parsed.data.issueDate) : null,
      expiryDate: parseDay(parsed.data.expiryDate),
    },
  });
  revalidatePath(`/admin/iscritti/${memberId}`);
  return { ok: "Certificato registrato." };
}

export async function deleteCertificate(form: FormData) {
  await requireAdmin();
  const c = await prisma.medicalCertificate.delete({ where: { id: str(form, "id") } });
  revalidatePath(`/admin/iscritti/${c.memberId}`);
}

export async function addPayment(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const memberId = str(form, "memberId");
  const amount = Number(str(form, "amount").replace(",", "."));
  if (!amount || Number.isNaN(amount) || amount <= 0) return { error: "Importo non valido." };
  const parsed = z
    .object({
      date: day,
      method: z.enum(["CONTANTI", "BONIFICO", "POS", "ALTRO"]),
      reason: z.enum(["QUOTA_ASSOCIATIVA", "CORSO", "ALTRO"]),
    })
    .safeParse({ date: str(form, "date"), method: str(form, "method"), reason: str(form, "reason") });
  if (!parsed.success) return { error: "Controlla data, metodo e causale." };
  await prisma.payment.create({
    data: {
      memberId,
      amount,
      date: parseDay(parsed.data.date),
      method: parsed.data.method,
      reason: parsed.data.reason,
      courseId: optStr(form, "courseId"),
      period: optStr(form, "period"),
      notes: optStr(form, "notes"),
    },
  });
  revalidatePath(`/admin/iscritti/${memberId}`);
  return { ok: "Pagamento registrato." };
}

export async function deletePayment(form: FormData) {
  await requireAdmin();
  const p = await prisma.payment.delete({ where: { id: str(form, "id") } });
  revalidatePath(`/admin/iscritti/${p.memberId}`);
  revalidatePath("/admin/pagamenti");
}
