"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { User } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { optStr, str, type ActionState } from "@/lib/forms";

/** Carica la lezione verificando che l'utente possa gestirla (admin o istruttore del corso). */
async function loadLesson(user: User, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson) throw new Error("Lezione non trovata");
  if (user.role !== "ADMIN" && lesson.course.instructorId !== user.id) throw new Error("Non autorizzato");
  return lesson;
}

export async function saveAttendance(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const lesson = await loadLesson(user, str(form, "lessonId"));
  const memberIds = form.getAll("member").map(String);
  const present = new Set(form.getAll("present").map(String));

  await prisma.$transaction(
    memberIds.map((memberId) =>
      prisma.attendance.upsert({
        where: { lessonId_memberId: { lessonId: lesson.id, memberId } },
        create: { lessonId: lesson.id, memberId, present: present.has(memberId) },
        update: { present: present.has(memberId) },
      }),
    ),
  );
  revalidatePath(`/calendario/${lesson.id}`);
  return { ok: `Presenze salvate: ${present.size} presenti su ${memberIds.length}.` };
}

export async function quickAddPerson(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const lesson = await loadLesson(user, str(form, "lessonId"));
  const parsed = z
    .object({
      firstName: z.string().min(1, "Il nome è obbligatorio."),
      lastName: z.string().min(1, "Il cognome è obbligatorio."),
      email: z.email("Email non valida.").nullable(),
      phone: z.string().nullable(),
    })
    .safeParse({
      firstName: str(form, "firstName"),
      lastName: str(form, "lastName"),
      email: optStr(form, "email")?.toLowerCase() ?? null,
      phone: optStr(form, "phone"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  // Se esiste già una persona con la stessa email o lo stesso telefono la riutilizziamo, per evitare doppioni.
  const match = [data.email && { email: data.email }, data.phone && { phone: data.phone }].filter(Boolean) as object[];
  const existing = match.length ? await prisma.member.findFirst({ where: { OR: match } }) : null;
  const member =
    existing ??
    (await prisma.member.create({
      data: { ...data, incomplete: true, contactStatus: "PROVA", createdById: user.id },
    }));
  if (existing && (existing.contactStatus === "DA_CONTATTARE" || existing.contactStatus === "CONTATTATO")) {
    await prisma.member.update({ where: { id: existing.id }, data: { contactStatus: "PROVA" } });
  }

  await prisma.$transaction([
    prisma.enrollment.upsert({
      where: { memberId_courseId: { memberId: member.id, courseId: lesson.courseId } },
      create: { memberId: member.id, courseId: lesson.courseId },
      update: { status: "ATTIVA" },
    }),
    prisma.attendance.upsert({
      where: { lessonId_memberId: { lessonId: lesson.id, memberId: member.id } },
      create: { lessonId: lesson.id, memberId: member.id, present: true },
      update: { present: true },
    }),
  ]);
  revalidatePath(`/calendario/${lesson.id}`);
  return {
    ok: existing
      ? `${member.firstName} ${member.lastName} era già in anagrafica: aggiunto/a al corso e segnato/a presente.`
      : `${member.firstName} ${member.lastName} aggiunto/a e segnato/a presente.`,
  };
}

export async function updateLessonInfo(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const lesson = await loadLesson(user, str(form, "lessonId"));
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: { cancelled: form.get("cancelled") === "on", notes: optStr(form, "notes") },
  });
  revalidatePath(`/calendario/${lesson.id}`);
  return { ok: "Lezione aggiornata." };
}
