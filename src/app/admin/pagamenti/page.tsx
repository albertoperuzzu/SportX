import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { EmptyState, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, parseDay, todayString } from "@/lib/dates";
import { formatEuro, PAYMENT_METHODS, PAYMENT_REASONS } from "@/lib/format";

type Search = { da?: string; a?: string; corso?: string; causale?: string };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const da = sp.da || `${todayString().slice(0, 7)}-01`;
  const a = sp.a || todayString();

  const where: Prisma.PaymentWhereInput = { date: { gte: parseDay(da), lte: parseDay(a) } };
  if (sp.corso) where.courseId = sp.corso;
  if (sp.causale) where.reason = sp.causale as keyof typeof PAYMENT_REASONS;

  const [payments, courses] = await Promise.all([
    prisma.payment.findMany({ where, include: { member: true, course: true }, orderBy: { date: "desc" } }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
  ]);
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <>
      <PageHeader title="Pagamenti" subtitle="I pagamenti si registrano dalla scheda dell'iscritto." />

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label>
          <span className="label">Dal</span>
          <input type="date" name="da" defaultValue={da} className="input" />
        </label>
        <label>
          <span className="label">Al</span>
          <input type="date" name="a" defaultValue={a} className="input" />
        </label>
        <label>
          <span className="label">Corso</span>
          <select name="corso" defaultValue={sp.corso ?? ""} className="input">
            <option value="">Tutti</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Causale</span>
          <select name="causale" defaultValue={sp.causale ?? ""} className="input">
            <option value="">Tutte</option>
            {Object.entries(PAYMENT_REASONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary">Filtra</button>
        <div className="ml-auto text-right">
          <div className="label">Totale periodo</div>
          <div className="font-display text-2xl text-brand-green">{formatEuro(total)}</div>
        </div>
      </form>

      {payments.length === 0 ? (
        <EmptyState>Nessun pagamento nel periodo selezionato.</EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Iscritto</th>
                <th>Importo</th>
                <th>Causale</th>
                <th>Corso / periodo</th>
                <th>Metodo</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td>
                    <Link href={`/admin/iscritti/${p.memberId}`} className="link">
                      {p.member.lastName} {p.member.firstName}
                    </Link>
                  </td>
                  <td className="font-semibold">{formatEuro(p.amount)}</td>
                  <td>{PAYMENT_REASONS[p.reason]}</td>
                  <td className="text-slate-600">{[p.course?.name, p.period].filter(Boolean).join(" · ") || "—"}</td>
                  <td>{PAYMENT_METHODS[p.method]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
