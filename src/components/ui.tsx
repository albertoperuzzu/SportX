import Link from "next/link";
import type { CertStatus } from "@/lib/certificates";
import { formatDate } from "@/lib/dates";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl text-brand-green sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

const badgeColors = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-600",
  purple: "bg-violet-100 text-violet-700",
} as const;

export function Badge({ color = "slate", children }: { color?: keyof typeof badgeColors; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColors[color]}`}>{children}</span>;
}

export function CertBadge({ status, expiry }: { status: CertStatus; expiry: Date | null }) {
  switch (status) {
    case "valido":
      return <Badge color="green">Valido fino al {formatDate(expiry)}</Badge>;
    case "in_scadenza":
      return <Badge color="amber">Scade il {formatDate(expiry)}</Badge>;
    case "scaduto":
      return <Badge color="red">Scaduto il {formatDate(expiry)}</Badge>;
    default:
      return <Badge color="red">Mancante</Badge>;
  }
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</p>;
}

export function StatCard({ label, value, href, tone = "green" }: { label: string; value: React.ReactNode; href?: string; tone?: "green" | "purple" | "orange" | "red" }) {
  const tones = {
    green: "border-l-brand-green",
    purple: "border-l-brand-purple",
    orange: "border-l-brand-orange",
    red: "border-l-red-500",
  };
  const content = (
    <div className={`card border-l-4 ${tones[tone]} ${href ? "transition hover:shadow-md" : ""}`}>
      <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</div>
      <div className="mt-1 font-display text-3xl text-slate-800">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
