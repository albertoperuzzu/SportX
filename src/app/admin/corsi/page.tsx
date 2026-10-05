import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, WEEKDAYS_SHORT } from "@/lib/dates";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      instructor: true,
      slots: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      _count: { select: { enrollments: { where: { status: "ATTIVA" } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="Corsi"
        actions={
          <Link href="/admin/corsi/nuovo" className="btn-accent">
            + Nuovo corso
          </Link>
        }
      />
      {courses.length === 0 ? (
        <EmptyState>Nessun corso ancora. Creane uno!</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/admin/corsi/${c.id}`} className={`card transition hover:shadow-md ${c.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg text-brand-green">{c.name}</h2>
                {!c.active && <Badge>Archiviato</Badge>}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {c.instructor ? `${c.instructor.firstName} ${c.instructor.lastName}` : <em>Nessun istruttore</em>}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.slots.map((s) => (
                  <Badge key={s.id} color="purple">
                    {WEEKDAYS_SHORT[s.weekday]} {s.startTime}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>{c._count.enrollments} iscritti attivi</span>
                <span>
                  {formatDate(c.startDate)} → {formatDate(c.endDate)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
