import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addDays, formatLongDate, formatShortDate, parseDay, startOfWeek, today, toDayString } from "@/lib/dates";

type Search = { settimana?: string; corso?: string };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isAdmin = user.role === "ADMIN";

  const weekStart = startOfWeek(sp.settimana && /^\d{4}-\d{2}-\d{2}$/.test(sp.settimana) ? parseDay(sp.settimana) : today());
  const weekEnd = addDays(weekStart, 6);

  const courseWhere: Prisma.CourseWhereInput = isAdmin ? {} : { instructorId: user.id };
  if (sp.corso) courseWhere.id = sp.corso;

  const [lessons, courses] = await Promise.all([
    prisma.lesson.findMany({
      where: { date: { gte: weekStart, lte: weekEnd }, course: courseWhere },
      include: {
        course: { include: { instructor: true } },
        attendances: { where: { present: true }, select: { id: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.course.findMany({ where: isAdmin ? { active: true } : { instructorId: user.id, active: true }, orderBy: { name: "asc" } }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = toDayString(today());
  const qs = (week: Date) => `?settimana=${toDayString(week)}${sp.corso ? `&corso=${sp.corso}` : ""}`;

  return (
    <>
      <PageHeader
        title="Calendario lezioni"
        subtitle={`Settimana ${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`}
        actions={
          <>
            <Link href={qs(addDays(weekStart, -7))} className="btn-secondary">
              ←
            </Link>
            <Link href={`/calendario${sp.corso ? `?corso=${sp.corso}` : ""}`} className="btn-secondary">
              Oggi
            </Link>
            <Link href={qs(addDays(weekStart, 7))} className="btn-secondary">
              →
            </Link>
          </>
        }
      />

      {courses.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href={`?settimana=${toDayString(weekStart)}`} className={!sp.corso ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
            Tutti i corsi
          </Link>
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`?settimana=${toDayString(weekStart)}&corso=${c.id}`}
              className={sp.corso === c.id ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {!isAdmin && courses.length === 0 && <EmptyState>Non hai ancora corsi assegnati. Chiedi a un admin di assegnarteli.</EmptyState>}

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const dayLessons = lessons.filter((l) => toDayString(l.date) === toDayString(d));
          const isToday = toDayString(d) === todayStr;
          return (
            <div key={d.toISOString()} className={`rounded-xl p-2 ${isToday ? "bg-violet-50 ring-2 ring-brand-purple" : "bg-white/60"}`}>
              <div className={`mb-2 text-xs font-bold uppercase ${isToday ? "text-brand-purple-dark" : "text-slate-500"}`}>
                {formatLongDate(d)}
              </div>
              {dayLessons.length === 0 ? (
                <div className="hidden text-xs text-slate-400 md:block">—</div>
              ) : (
                <div className="space-y-2">
                  {dayLessons.map((l) => (
                    <Link
                      key={l.id}
                      href={`/calendario/${l.id}`}
                      className={`block rounded-lg border-l-4 bg-white p-2 text-sm shadow-sm transition hover:shadow-md ${
                        l.cancelled ? "border-l-red-400 opacity-60" : "border-l-brand-orange"
                      }`}
                    >
                      <div className="font-semibold">
                        {l.startTime}–{l.endTime}
                      </div>
                      <div className="text-brand-green">{l.course.name}</div>
                      {isAdmin && l.course.instructor && <div className="text-xs text-slate-500">{l.course.instructor.firstName}</div>}
                      <div className="mt-1">
                        {l.cancelled ? (
                          <Badge color="red">Annullata</Badge>
                        ) : l.attendances.length > 0 ? (
                          <Badge color="green">{l.attendances.length} presenti</Badge>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
