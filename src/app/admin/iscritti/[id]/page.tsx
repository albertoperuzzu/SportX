import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, CertBadge, Field, PageHeader } from "@/components/ui";
import { certificateStatus } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { formatDate, today, todayString } from "@/lib/dates";
import { CERTIFICATE_TYPES, ENROLLMENT_STATUS, formatEuro, PAYMENT_METHODS, PAYMENT_REASONS } from "@/lib/format";
import { enrollMember, setEnrollmentStatus } from "../../corsi/actions";
import {
  addCertificate,
  addPayment,
  addSubscription,
  deleteCertificate,
  deleteMember,
  deletePayment,
  deleteSubscription,
  updateMember,
} from "../actions";
import { SubBadge } from "@/components/SubBadge";
import { loadSubscriptionStatuses } from "@/lib/subscription-status";
import { CARNET_ENTRIES, SUBSCRIPTION_TYPES } from "@/lib/subscriptions";
import { PRICE_FIELDS } from "../../corsi/CourseFields";
import { SubscriptionForm } from "../SubscriptionForm";
import { MemberFields } from "../MemberFields";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      createdBy: true,
      certificates: { orderBy: { expiryDate: "desc" } },
      enrollments: {
        include: { course: true, subscriptions: { orderBy: { startDate: "desc" } } },
        orderBy: { enrolledAt: "desc" },
      },
      payments: { include: { course: true }, orderBy: { date: "desc" } },
      attendances: {
        include: { lesson: { include: { course: true } } },
        orderBy: { lesson: { date: "desc" } },
        take: 30,
      },
    },
  });
  if (!member) notFound();

  const [courses, subStatuses] = await Promise.all([
    prisma.course.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    loadSubscriptionStatuses(member.enrollments, today()),
  ]);
  const enrollmentOptions = member.enrollments.map((e) => ({
    id: e.id,
    courseName: e.course.name,
    prices: Object.fromEntries(PRICE_FIELDS.map(([name, type]) => [type, e.course[name]?.toString() ?? ""])),
  }));
  const notEnrolled = courses.filter((c) => !member.enrollments.some((e) => e.courseId === c.id));
  const cert = certificateStatus(member.certificates);
  const presentCount = member.attendances.filter((a) => a.present).length;

  return (
    <>
      <PageHeader
        title={`${member.firstName} ${member.lastName}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            Certificato: <CertBadge {...cert} />
            {member.incomplete && <Badge color="amber">Anagrafica da completare</Badge>}
            {member.createdBy && (
              <span className="text-xs">
                inserito da {member.createdBy.firstName} {member.createdBy.lastName} il {formatDate(member.createdAt)}
              </span>
            )}
          </span>
        }
        actions={
          <Link href="/admin/iscritti" className="btn-secondary">
            ← Iscritti
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-bold">Anagrafica</h2>
          <ActionForm action={updateMember} className="space-y-4">
            <input type="hidden" name="id" value={member.id} />
            <MemberFields member={member} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="incomplete" defaultChecked={member.incomplete} className="h-4 w-4" />
              Anagrafica ancora da completare
            </label>
            <SubmitButton>Salva anagrafica</SubmitButton>
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Certificati medici</h2>
          {member.certificates.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100">
              {member.certificates.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {CERTIFICATE_TYPES[c.type]} · rilasciato {formatDate(c.issueDate)} · <strong>scade {formatDate(c.expiryDate)}</strong>
                  </span>
                  <form action={deleteCertificate}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton className="btn-danger btn-sm" confirm="Eliminare questo certificato?">
                      ✕
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addCertificate} resetOnSuccess className="grid gap-2 sm:grid-cols-3">
            <input type="hidden" name="memberId" value={member.id} />
            <Field label="Tipo">
              <select name="type" className="input">
                {Object.entries(CERTIFICATE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rilasciato il">
              <input name="issueDate" type="date" className="input" />
            </Field>
            <Field label="Scadenza *">
              <input name="expiryDate" type="date" required className="input" />
            </Field>
            <div className="sm:col-span-3">
              <SubmitButton className="btn-secondary">Aggiungi certificato</SubmitButton>
            </div>
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Corsi</h2>
          {member.enrollments.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100">
              {member.enrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    <Link href={`/admin/corsi/${e.courseId}`} className="link">
                      {e.course.name}
                    </Link>{" "}
                    <span className="text-xs text-slate-500">dal {formatDate(e.enrolledAt)}</span>
                  </span>
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
                </li>
              ))}
            </ul>
          )}
          {notEnrolled.length > 0 && (
            <ActionForm action={enrollMember} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="memberId" value={member.id} />
              <Field label="Iscrivi a un corso" className="min-w-48 flex-1">
                <select name="courseId" className="input">
                  {notEnrolled.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <SubmitButton className="btn-secondary">Iscrivi</SubmitButton>
            </ActionForm>
          )}
        </section>

        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-bold">Abbonamenti</h2>
          {member.enrollments.length === 0 ? (
            <p className="text-sm text-slate-500">Iscrivi prima la persona a un corso.</p>
          ) : (
            <>
              <div className="mb-4 space-y-4">
                {member.enrollments.map((e) => {
                  const status = subStatuses.get(e.id)!;
                  return (
                    <div key={e.id}>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <strong className="text-sm">{e.course.name}</strong>
                        <SubBadge status={status} />
                        {status.uncovered > 0 && (
                          <span className="text-xs text-red-600">{status.uncovered} presenze non coperte da abbonamento</span>
                        )}
                      </div>
                      {e.subscriptions.length > 0 && (
                        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                          {e.subscriptions.map((sub) => (
                            <li key={sub.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                              <span>
                                <strong>{SUBSCRIPTION_TYPES[sub.type]}</strong> {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                                {sub.type === "CARNET" && (
                                  <span className="text-slate-600">
                                    {" "}
                                    · {status.carnetUsage.get(sub.id) ?? 0}/{sub.entries ?? CARNET_ENTRIES} ingressi usati
                                  </span>
                                )}
                                {sub.price && <span className="text-slate-600"> · {formatEuro(sub.price)}</span>}
                                {sub.notes && <span className="block text-xs text-slate-500">{sub.notes}</span>}
                              </span>
                              <form action={deleteSubscription}>
                                <input type="hidden" name="id" value={sub.id} />
                                <SubmitButton className="btn-danger btn-sm" confirm="Eliminare questo abbonamento?">
                                  ✕
                                </SubmitButton>
                              </form>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
              <SubscriptionForm enrollments={enrollmentOptions} action={addSubscription} />
            </>
          )}
        </section>

        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-bold">Pagamenti</h2>
          {member.payments.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Importo</th>
                    <th>Causale</th>
                    <th>Corso / periodo</th>
                    <th>Metodo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {member.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.date)}</td>
                      <td className="font-semibold">{formatEuro(p.amount)}</td>
                      <td>{PAYMENT_REASONS[p.reason]}</td>
                      <td className="text-slate-600">
                        {[p.course?.name, p.period].filter(Boolean).join(" · ") || "—"}
                        {p.notes && <div className="text-xs">{p.notes}</div>}
                      </td>
                      <td>{PAYMENT_METHODS[p.method]}</td>
                      <td className="text-right">
                        <form action={deletePayment}>
                          <input type="hidden" name="id" value={p.id} />
                          <SubmitButton className="btn-danger btn-sm" confirm="Eliminare questo pagamento?">
                            ✕
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ActionForm action={addPayment} resetOnSuccess className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <input type="hidden" name="memberId" value={member.id} />
            <Field label="Importo € *">
              <input name="amount" inputMode="decimal" required className="input" />
            </Field>
            <Field label="Data *">
              <input name="date" type="date" required defaultValue={todayString()} className="input" />
            </Field>
            <Field label="Causale">
              <select name="reason" className="input">
                {Object.entries(PAYMENT_REASONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Corso">
              <select name="courseId" className="input">
                <option value="">—</option>
                {member.enrollments.map((e) => (
                  <option key={e.courseId} value={e.courseId}>
                    {e.course.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Periodo">
              <input name="period" placeholder="Es. Ottobre 2026" className="input" />
            </Field>
            <Field label="Metodo">
              <select name="method" className="input">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note" className="sm:col-span-2 lg:col-span-5">
              <input name="notes" className="input" />
            </Field>
            <div className="flex items-end">
              <SubmitButton className="btn-accent w-full">Registra</SubmitButton>
            </div>
          </ActionForm>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-bold">
            Presenze recenti{" "}
            {member.attendances.length > 0 && (
              <span className="text-sm font-normal text-slate-500">
                ({presentCount}/{member.attendances.length} presente)
              </span>
            )}
          </h2>
          {member.attendances.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna presenza registrata.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {member.attendances.map((a) => (
                <Link key={a.id} href={`/calendario/${a.lessonId}`}>
                  <Badge color={a.present ? "green" : "red"}>
                    {formatDate(a.lesson.date)} · {a.lesson.course.name} · {a.present ? "presente" : "assente"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <form action={deleteMember} className="mt-8 text-right">
        <input type="hidden" name="id" value={member.id} />
        <SubmitButton
          className="btn-danger"
          confirm={`Eliminare definitivamente ${member.firstName} ${member.lastName} con certificati, pagamenti e presenze?`}
        >
          Elimina iscritto
        </SubmitButton>
      </form>
    </>
  );
}
