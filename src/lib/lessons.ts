import { prisma } from "./db";
import { addDays, isoWeekday, today } from "./dates";

/**
 * Crea le lezioni mancanti di un corso in base agli orari ricorrenti,
 * da oggi (o dall'inizio del corso se futuro) fino alla fine del corso.
 */
export async function generateLessons(courseId: string) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId }, include: { slots: true } });
  if (course.slots.length === 0) return 0;

  const from = course.startDate > today() ? course.startDate : today();
  const data: { courseId: string; date: Date; startTime: string; endTime: string }[] = [];
  for (let d = from; d <= course.endDate; d = addDays(d, 1)) {
    for (const slot of course.slots) {
      if (slot.weekday === isoWeekday(d)) {
        data.push({ courseId, date: d, startTime: slot.startTime, endTime: slot.endTime });
      }
    }
  }
  const res = await prisma.lesson.createMany({ data, skipDuplicates: true });
  return res.count;
}

/** Rimuove le lezioni future senza presenze registrate che non corrispondono più a nessun orario. */
export async function removeOrphanLessons(courseId: string) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId }, include: { slots: true } });
  const future = await prisma.lesson.findMany({
    where: { courseId, date: { gte: today() }, attendances: { none: {} } },
  });
  const orphanIds = future
    .filter((l) => !course.slots.some((s) => s.weekday === isoWeekday(l.date) && s.startTime === l.startTime))
    .map((l) => l.id);
  if (orphanIds.length) await prisma.lesson.deleteMany({ where: { id: { in: orphanIds } } });
  return orphanIds.length;
}
