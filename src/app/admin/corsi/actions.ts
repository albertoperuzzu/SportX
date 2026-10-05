"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDay } from "@/lib/dates";
import { optStr, parsePrice, str, type ActionState } from "@/lib/forms";
import { generateLessons, removeOrphanLessons } from "@/lib/lessons";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida.");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Orario non valido.");

const courseSchema = z
  .object({
    name: z.string().min(1, "Il nome è obbligatorio."),
    description: z.string().nullable(),
    location: z.string().nullable(),
    startDate: day,
    endDate: day,
    instructorId: z.string().nullable(),
  })
  .refine((c) => c.startDate <= c.endDate, "La data di fine deve essere successiva all'inizio.");

function parseCourse(form: FormData) {
  const parsed = courseSchema.safeParse({
    name: str(form, "name"),
    description: optStr(form, "description"),
    location: optStr(form, "location"),
    startDate: str(form, "startDate"),
    endDate: str(form, "endDate"),
    instructorId: optStr(form, "instructorId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const c = parsed.data;
  const prices = {
    priceMonthly: parsePrice(form, "priceMonthly"),
    priceQuarterly: parsePrice(form, "priceQuarterly"),
    priceYearly: parsePrice(form, "priceYearly"),
    priceCarnet: parsePrice(form, "priceCarnet"),
  };
  if (Object.values(prices).some((p) => Number.isNaN(p))) return { error: "Controlla i prezzi del listino." } as const;
  return {
    data: {
      name: c.name,
      description: c.description,
      location: c.location,
      ...prices,
      startDate: parseDay(c.startDate),
      endDate: parseDay(c.endDate),
      instructorId: c.instructorId,
    },
  } as const;
}

export async function createCourse(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const res = parseCourse(form);
  if ("error" in res) return { error: res.error };
  const course = await prisma.course.create({ data: res.data });
  redirect(`/admin/corsi/${course.id}`);
}

export async function updateCourse(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  const res = parseCourse(form);
  if ("error" in res) return { error: res.error };
  await prisma.course.update({ where: { id }, data: res.data });
  await generateLessons(id);
  revalidatePath(`/admin/corsi/${id}`);
  return { ok: "Corso aggiornato." };
}

export async function toggleCourseActive(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const course = await prisma.course.findUniqueOrThrow({ where: { id } });
  await prisma.course.update({ where: { id }, data: { active: !course.active } });
  revalidatePath(`/admin/corsi/${id}`);
}

export async function addSlot(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const courseId = str(form, "courseId");
  const parsed = z
    .object({ weekday: z.coerce.number().int().min(1).max(7), startTime: time, endTime: time })
    .refine((s) => s.startTime < s.endTime, "L'orario di fine deve essere dopo l'inizio.")
    .safeParse({ weekday: str(form, "weekday"), startTime: str(form, "startTime"), endTime: str(form, "endTime") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.courseSlot.create({ data: { courseId, ...parsed.data } });
  const created = await generateLessons(courseId);
  revalidatePath(`/admin/corsi/${courseId}`);
  return { ok: `Orario aggiunto: create ${created} lezioni.` };
}

export async function removeSlot(form: FormData) {
  await requireAdmin();
  const slot = await prisma.courseSlot.delete({ where: { id: str(form, "id") } });
  await removeOrphanLessons(slot.courseId);
  revalidatePath(`/admin/corsi/${slot.courseId}`);
}

export async function addExtraLesson(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const courseId = str(form, "courseId");
  const parsed = z
    .object({ date: day, startTime: time, endTime: time })
    .safeParse({ date: str(form, "date"), startTime: str(form, "startTime"), endTime: str(form, "endTime") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { date, startTime, endTime } = parsed.data;
  const existing = await prisma.lesson.findUnique({
    where: { courseId_date_startTime: { courseId, date: parseDay(date), startTime } },
  });
  if (existing) return { error: "Esiste già una lezione in quella data e ora." };
  await prisma.lesson.create({ data: { courseId, date: parseDay(date), startTime, endTime } });
  revalidatePath(`/admin/corsi/${courseId}`);
  return { ok: "Lezione aggiunta." };
}

export async function deleteLesson(form: FormData) {
  await requireAdmin();
  const lesson = await prisma.lesson.delete({ where: { id: str(form, "id") } });
  revalidatePath(`/admin/corsi/${lesson.courseId}`);
}

export async function enrollMember(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const courseId = str(form, "courseId");
  const memberId = str(form, "memberId");
  if (!memberId) return { error: "Seleziona un iscritto." };
  await prisma.enrollment.upsert({
    where: { memberId_courseId: { memberId, courseId } },
    create: { memberId, courseId },
    update: { status: "ATTIVA" },
  });
  revalidatePath(`/admin/corsi/${courseId}`);
  revalidatePath(`/admin/iscritti/${memberId}`);
  return { ok: "Iscrizione registrata." };
}

export async function setEnrollmentStatus(form: FormData) {
  await requireAdmin();
  const status = z.enum(["ATTIVA", "SOSPESA", "TERMINATA"]).parse(str(form, "status"));
  const e = await prisma.enrollment.update({ where: { id: str(form, "id") }, data: { status } });
  revalidatePath(`/admin/corsi/${e.courseId}`);
  revalidatePath(`/admin/iscritti/${e.memberId}`);
}

export async function deleteEnrollment(form: FormData) {
  await requireAdmin();
  const e = await prisma.enrollment.delete({ where: { id: str(form, "id") } });
  revalidatePath(`/admin/corsi/${e.courseId}`);
  revalidatePath(`/admin/iscritti/${e.memberId}`);
}
