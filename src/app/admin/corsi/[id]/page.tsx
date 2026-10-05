import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, CertBadge, EmptyState, Field, PageHeader } from "@/components/ui";
import { certificateStatus } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { formatDate, formatLongDate, today, WEEKDAYS } from "@/lib/dates";
import { ENROLLMENT_STATUS, formatEuro } from "@/lib/format";
import { loadSubscriptionStatuses } from "@/lib/subscription-status";
import { SUBSCRIPTION_TYPES } from "@/lib/subscriptions";
import {
  addExtraLesson,
  addSlot,
  deleteEnrollment,
  deleteLesson,
  enrollMember,
  removeSlot,
  setEnrollmentStatus,
  toggleCourseActive,
  updateCourse,
} from "../actions";
import { CourseFields, PRICE_FIELDS } from "../CourseFields";
import { SubBadge } from "@/components/SubBadge";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: true,
      slots: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      enrollments: {
        include: { member: { include: { certificates: true } } },
        orderBy: [{ status: "asc" }, { member: { lastName: "asc" } }],
      },
    },
  });
  if (!course) notFound();

  const [subStatuses, instructors, members, upcoming, past] = await Promise.all([
    loadSubscriptionStatuses(course.enrollments, today()),
    prisma.user.findMany({ where: { active: true }, orderBy: { lastName: "asc" } }),
    prisma.member.findMany({
      where: { enrollments: { none: { courseId: id } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.lesson.findMany({
      where: { courseId: id, date: { gte: today() } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 12,
      include: { _count: { select: { attendances: true } } },
    }),
    prisma.lesson.findMany({
      where: { courseId: id, date: { lt: today() } },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 12,
      include: { attendances: { where: { present: true }, select: { id: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={course.name}
        subtitle={
          <>
            {course.instructor ? `Istruttore: ${course.instructor.firstName} ${course.instructor.lastName}` : "Nessun istruttore"}
            {" · "}
            {formatDate(course.startDate)} → {formatDate(course.endDate)}
            {!course.active && " · ARCHIVIATO"}
          </>
        }
        actions={
          <form action={toggleCourseActive}>
            <input type="hidden" name="id" value={course.id} />
            <SubmitButton className="btn-secondary">{course.active ? "Archivia corso" : "Riattiva corso"}</SubmitButton>
          </form>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-bold">Orari settimanali</h2>
          {course.slots.length === 0 ? (
            <p className="mb-3 text-sm text-slate-500">Nessun orario: aggiungine uno per generare automaticamente le lezioni.</p>
          ) : (
            <ul className="mb-4 divide-y divide-slate-100">
              {course.slots.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <strong>{WEEKDAYS[s.weekday]}</strong> {s.startTime}–{s.endTime}
                  </span>
                  <form action={removeSlot}>
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton className="btn-danger btn-sm" confirm="Rimuovere questo orario? Le lezioni future senza presenze verranno eliminate.">
                      Rimuovi
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addSlot} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="courseId" value={course.id} />
            <Field label="Giorno">
              <select name="weekday" className="input">
                {WEEKDAYS.slice(1).map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dalle">
              <input name="startTime" type="time" required className="input" />
            </Field>
            <Field label="Alle">
              <input name="endTime" type="time" required className="input" />
            </Field>
            <SubmitButton>Aggiungi</SubmitButton>
          </ActionForm>
        </section>

        <section className="card">
          <details>
            <summary className="cursor-pointer font-bold">Modifica dati del corso</summary>
            <ActionForm action={updateCourse} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={course.id} />
              <CourseFields course={course} instructors={instructors} />
              <SubmitButton>Salva modifiche</SubmitButton>
            </ActionForm>
          </details>
          {course.description && <p className="mt-3 text-sm text-slate-600">{course.description}</p>}
          {course.location && <p className="mt-1 text-sm text-slate-500">📍 {course.location}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRICE_FIELDS.map(([name, type]) => (
              <div key={name} className="rounded-lg bg-slate-50 p-2 text-center">
                <dt className="text-xs text-slate-500">{SUBSCRIPTION_TYPES[type]}</dt>
                <dd className="font-semibold">{formatEuro(course[name])}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-bold">Iscritti ({course.enrollments.filter((e) => e.status === "ATTIVA").length} attivi)</h2>
          {course.enrollments.length === 0 ? (
            <EmptyState>Nessun iscritto al corso.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Certificato</th>
                    <th>Abbonamento</th>
                    <th>Iscritto dal</th>
                    <th>Stato</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {course.enrollments.map((e) => {
                    const cert = certificateStatus(e.member.certificates);
                    return (
                      <tr key={e.id}>
                        <td>
                          <Link href={`/admin/iscritti/${e.member.id}`} className="link">
                            {e.member.lastName} {e.member.firstName}
                          </Link>
                          {e.member.incomplete && (
                            <span className="ml-2">
                              <Badge color="amber">Da completare</Badge>
                            </span>
                          )}
                        </td>
                        <td>
                          <CertBadge {...cert} />
                        </td>
                        <td>
                          <SubBadge status={subStatuses.get(e.id)!} />
                        </td>
                        <td>{formatDate(e.enrolledAt)}</td>
                        <td>
                          <form action={setEnrollmentStatus} className="flex gap-1">
                            <input type="hidden" name="id" value={e.id} />
                            <select name="status" defaultValue={e.status} className="input py-1">
                              {Object.entries(ENROLLMENT_STATUS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                            <SubmitButton className="btn-secondary btn-sm">OK</SubmitButton>
                          </form>
                        </td>
                        <td className="text-right">
                          <form action={deleteEnrollment}>
                            <input type="hidden" name="id" value={e.id} />
                            <SubmitButton className="btn-danger btn-sm" confirm="Rimuovere l'iscrizione? (lo storico presenze resta)">
                              ✕
                            </SubmitButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ActionForm action={enrollMember} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="courseId" value={course.id} />
            <Field label="Aggiungi iscritto esistente" className="min-w-64 flex-1">
              <select name="memberId" className="input" defaultValue="">
                <option value="" disabled>
                  Seleziona…
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.lastName} {m.firstName}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton>Iscrivi</SubmitButton>
            <Link href={`/admin/iscritti/nuovo?corso=${course.id}`} className="btn-secondary">
              + Nuovo iscritto
            </Link>
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Prossime lezioni</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna lezione in programma.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/calendario/${l.id}`} className="link capitalize">
                    {formatLongDate(l.date)} · {l.startTime}
                  </Link>
                  <span className="flex items-center gap-2">
                    {l.cancelled && <Badge color="red">Annullata</Badge>}
                    {l._count.attendances === 0 && (
                      <form action={deleteLesson}>
                        <input type="hidden" name="id" value={l.id} />
                        <SubmitButton className="btn-danger btn-sm" confirm="Eliminare questa lezione?">
                          Elimina
                        </SubmitButton>
                      </form>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addExtraLesson} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
            <input type="hidden" name="courseId" value={course.id} />
            <Field label="Lezione extra">
              <input name="date" type="date" required className="input" />
            </Field>
            <Field label="Dalle">
              <input name="startTime" type="time" required className="input" />
            </Field>
            <Field label="Alle">
              <input name="endTime" type="time" required className="input" />
            </Field>
            <SubmitButton className="btn-secondary">Aggiungi</SubmitButton>
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Lezioni passate</h2>
          {past.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna lezione passata.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {past.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/calendario/${l.id}`} className="link capitalize">
                    {formatLongDate(l.date)} · {l.startTime}
                  </Link>
                  {l.cancelled ? <Badge color="red">Annullata</Badge> : <Badge color="green">{l.attendances.length} presenti</Badge>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
