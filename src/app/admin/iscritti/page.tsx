import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge, CertBadge, EmptyState, PageHeader } from "@/components/ui";
import { certificateStatus } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { today } from "@/lib/dates";
import { SubBadge } from "@/components/SubBadge";
import { loadSubscriptionStatuses } from "@/lib/subscription-status";
import { needsRenewal } from "@/lib/subscriptions";

type Search = { q?: string; filtro?: string; corso?: string };

export default async function MembersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", filtro = "", corso = "" } = await searchParams;

  const where: Prisma.MemberWhereInput = {};
  if (q) {
    where.OR = ["firstName", "lastName", "email", "fiscalCode", "phone"].map((f) => ({
      [f]: { contains: q, mode: "insensitive" },
    }));
  }
  if (filtro === "incompleti") where.incomplete = true;
  if (corso) where.enrollments = { some: { courseId: corso, status: "ATTIVA" } };

  const [members, courses] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        certificates: { select: { expiryDate: true } },
        enrollments: { where: { status: "ATTIVA" }, include: { course: { select: { name: true } } } },
      },
    }),
    prisma.course.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const subStatuses = await loadSubscriptionStatuses(
    members.flatMap((m) => m.enrollments),
    today(),
  );
  const rows = members
    .map((m) => ({ ...m, cert: certificateStatus(m.certificates) }))
    .filter((m) => filtro !== "certificato" || m.cert.status !== "valido")
    .filter((m) => filtro !== "abbonamento" || m.enrollments.some((e) => needsRenewal(subStatuses.get(e.id)!.kind)));

  return (
    <>
      <PageHeader
        title="Iscritti"
        subtitle={`${rows.length} risultati`}
        actions={
          <Link href="/admin/iscritti/nuovo" className="btn-accent">
            + Nuovo iscritto
          </Link>
        }
      />

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <input name="q" defaultValue={q} placeholder="Cerca nome, email, telefono, CF…" className="input max-w-xs" />
        <select name="corso" defaultValue={corso} className="input max-w-xs">
          <option value="">Tutti i corsi</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="filtro" defaultValue={filtro} className="input max-w-xs">
          <option value="">Tutti</option>
          <option value="incompleti">Anagrafica da completare</option>
          <option value="certificato">Certificato scaduto/mancante/in scadenza</option>
          <option value="abbonamento">Abbonamento da rinnovare</option>
        </select>
        <button className="btn-primary">Filtra</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState>Nessun iscritto trovato.</EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contatti</th>
                <th>Corsi e abbonamenti</th>
                <th>Certificato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/admin/iscritti/${m.id}`} className="link">
                      {m.lastName} {m.firstName}
                    </Link>
                    {m.incomplete && (
                      <span className="ml-2">
                        <Badge color="amber">Da completare</Badge>
                      </span>
                    )}
                  </td>
                  <td className="text-slate-600">
                    <div>{m.phone}</div>
                    <div className="text-xs">{m.email}</div>
                  </td>
                  <td className="text-slate-600">
                    {m.enrollments.length === 0
                      ? "—"
                      : m.enrollments.map((e) => (
                          <div key={e.id} className="flex flex-wrap items-center gap-1 py-0.5">
                            <span>{e.course.name}</span>
                            <SubBadge status={subStatuses.get(e.id)!} />
                          </div>
                        ))}
                  </td>
                  <td>
                    <CertBadge {...m.cert} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
