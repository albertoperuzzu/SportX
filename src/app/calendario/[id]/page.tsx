import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { certificateStatus } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { formatLongDate, toDayString } from "@/lib/dates";
import { quickAddPerson, saveAttendance, updateLessonInfo } from "../actions";
import { AttendanceList } from "../AttendanceList";

const CERT_WARNINGS = { scaduto: "certificato scaduto", mancante: "certificato mancante" } as const;

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      course: {
        include: {
          instructor: true,
          enrollments: { where: { status: "ATTIVA" }, include: { member: { include: { certificates: true } } } },
        },
      },
      attendances: { include: { member: { include: { certificates: true } } } },
    },
  });
  if (!lesson) notFound();
  if (user.role !== "ADMIN" && lesson.course.instructorId !== user.id) redirect("/calendario");

  // Iscritti attivi + chiunque abbia già una presenza registrata per questa lezione
  const byId = new Map(lesson.course.enrollments.map((e) => [e.member.id, e.member]));
  for (const a of lesson.attendances) byId.set(a.member.id, a.member);
  const attendance = new Map(lesson.attendances.map((a) => [a.memberId, a.present]));
  const people = [...byId.values()]
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
    .map((m) => {
      const status = certificateStatus(m.certificates).status;
      return {
        id: m.id,
        name: `${m.lastName} ${m.firstName}`,
        present: attendance.get(m.id) ?? false,
        incomplete: m.incomplete,
        warning: status === "scaduto" || status === "mancante" ? CERT_WARNINGS[status] : undefined,
      };
    });

  return (
    <>
      <PageHeader
        title={lesson.course.name}
        subtitle={
          <span>
            <span className="capitalize">{formatLongDate(lesson.date)}</span> · {lesson.startTime}–{lesson.endTime}
            {lesson.course.location && ` · ${lesson.course.location}`}
          </span>
        }
        actions={
          <Link href={`/calendario?settimana=${toDayString(lesson.date)}`} className="btn-secondary">
            ← Calendario
          </Link>
        }
      />

      {lesson.cancelled && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Questa lezione è stata annullata.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card">
          <h2 className="mb-3 font-bold">Presenze</h2>
          {people.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun iscritto al corso. Aggiungi una persona qui a fianco.</p>
          ) : (
            <ActionForm action={saveAttendance} key={people.map((p) => p.id).join()}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <AttendanceList people={people} />
              <SubmitButton className="btn-primary mt-4 w-full py-3">Salva presenze</SubmitButton>
            </ActionForm>
          )}
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-1 font-bold">Aggiungi persona</h2>
            <p className="mb-3 text-xs text-slate-500">
              Viene iscritta al corso e segnata presente. Gli altri dati li completerà un admin.
            </p>
            <ActionForm action={quickAddPerson} resetOnSuccess className="space-y-3">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Nome *">
                  <input name="firstName" required className="input" />
                </Field>
                <Field label="Cognome *">
                  <input name="lastName" required className="input" />
                </Field>
              </div>
              <Field label="Email">
                <input name="email" type="email" className="input" />
              </Field>
              <Field label="Telefono">
                <input name="phone" type="tel" className="input" />
              </Field>
              <SubmitButton className="btn-accent w-full">Aggiungi e segna presente</SubmitButton>
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="mb-3 font-bold">Note lezione</h2>
            <ActionForm action={updateLessonInfo} className="space-y-3">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <textarea name="notes" rows={3} defaultValue={lesson.notes ?? ""} className="input" placeholder="Es. lezione spostata in sala B" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="cancelled" defaultChecked={lesson.cancelled} className="h-4 w-4" />
                Lezione annullata
              </label>
              <SubmitButton className="btn-secondary">Salva</SubmitButton>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
