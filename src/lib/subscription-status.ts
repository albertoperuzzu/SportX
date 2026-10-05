import "server-only";
import { prisma } from "./db";
import { subscriptionStatus, type SubStatus } from "./subscriptions";

type EnrollmentRef = { id: string; memberId: string; courseId: string };

/**
 * Stato abbonamento (alla data `at`) per un insieme di iscrizioni, con due sole query.
 * Se `lessonId` è indicato, la presenza a quella lezione è considerata "corrente".
 */
export async function loadSubscriptionStatuses(enrollments: EnrollmentRef[], at: Date, lessonId?: string) {
  const result = new Map<string, SubStatus>();
  if (enrollments.length === 0) return result;

  const [subs, atts] = await Promise.all([
    prisma.subscription.findMany({ where: { enrollmentId: { in: enrollments.map((e) => e.id) } } }),
    prisma.attendance.findMany({
      where: {
        present: true,
        memberId: { in: [...new Set(enrollments.map((e) => e.memberId))] },
        lesson: { courseId: { in: [...new Set(enrollments.map((e) => e.courseId))] } },
      },
      select: { id: true, memberId: true, lessonId: true, lesson: { select: { date: true, courseId: true } } },
    }),
  ]);

  for (const e of enrollments) {
    const mine = atts.filter((a) => a.memberId === e.memberId && a.lesson.courseId === e.courseId);
    const current = lessonId ? mine.find((a) => a.lessonId === lessonId)?.id : undefined;
    result.set(
      e.id,
      subscriptionStatus(
        subs.filter((s) => s.enrollmentId === e.id),
        mine.map((a) => ({ id: a.id, date: a.lesson.date })),
        at,
        current,
      ),
    );
  }
  return result;
}
