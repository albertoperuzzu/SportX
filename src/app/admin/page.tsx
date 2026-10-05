import Link from "next/link";
import { Badge, CertBadge, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { certificateStatus } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { formatDate, formatLongDate, parseDay, today, todayString } from "@/lib/dates";
import { formatEuro, PAYMENT_REASONS } from "@/lib/format";

export default async function AdminDashboard() {
  const monthStart = parseDay(`${todayString().slice(0, 7)}-01`);

  const [activeMembers, activeCourses, incomplete, monthPayments, recentPayments, todayLessons] = await Promise.all([
    prisma.member.findMany({
      where: { enrollments: { some: { status: "ATTIVA" } } },
      include: { certificates: { select: { expiryDate: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.course.count({ where: { active: true } }),
    prisma.member.findMany({ where: { incomplete: true }, include: { createdBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.payment.aggregate({ where: { date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.payment.findMany({ include: { member: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 6 }),
    prisma.lesson.findMany({
      where: { date: today() },
      include: { course: { include: { instructor: true } }, attendances: { where: { present: true }, select: { id: true } } },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const certIssues = activeMembers
    .map((m) => ({ ...m, cert: certificateStatus(m.certificates) }))
    .filter((m) => m.cert.status !== "valido")
    .sort((a, b) => (a.cert.expiry?.getTime() ?? 0) - (b.cert.expiry?.getTime() ?? 0));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={<span className="capitalize">{formatLongDate(today())}</span>} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Iscritti attivi" value={activeMembers.length} href="/admin/iscritti" />
        <StatCard label="Corsi attivi" value={activeCourses} href="/admin/corsi" tone="purple" />
        <StatCard label="Incassi del mese" value={formatEuro(monthPayments._sum.amount ?? 0)} href="/admin/pagamenti" tone="orange" />
        <StatCard
          label="Certificati da sistemare"
          value={certIssues.length}
          href="/admin/iscritti?filtro=certificato"
          tone={certIssues.length ? "red" : "green"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-bold">Certificati scaduti, mancanti o in scadenza</h2>
          {certIssues.length === 0 ? (
            <EmptyState>Tutti i certificati degli iscritti attivi sono in regola 🎉</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {certIssues.slice(0, 10).map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/admin/iscritti/${m.id}`} className="link">
                    {m.lastName} {m.firstName}
                  </Link>
                  <CertBadge {...m.cert} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Anagrafiche da completare</h2>
          {incomplete.length === 0 ? (
            <EmptyState>Nessuna anagrafica in sospeso.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {incomplete.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/admin/iscritti/${m.id}`} className="link">
                    {m.lastName} {m.firstName}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {m.createdBy ? `da ${m.createdBy.firstName}` : ""} il {formatDate(m.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Lezioni di oggi</h2>
          {todayLessons.length === 0 ? (
            <EmptyState>Nessuna lezione oggi.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todayLessons.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/calendario/${l.id}`} className="link">
                    {l.startTime} · {l.course.name}
                  </Link>
                  {l.cancelled ? (
                    <Badge color="red">Annullata</Badge>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {l.course.instructor?.firstName ?? "—"} · {l.attendances.length} presenti
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Ultimi pagamenti</h2>
          {recentPayments.length === 0 ? (
            <EmptyState>Nessun pagamento registrato.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <Link href={`/admin/iscritti/${p.memberId}`} className="link">
                      {p.member.lastName} {p.member.firstName}
                    </Link>{" "}
                    <span className="text-xs text-slate-500">
                      {formatDate(p.date)} · {PAYMENT_REASONS[p.reason]}
                    </span>
                  </span>
                  <strong>{formatEuro(p.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
