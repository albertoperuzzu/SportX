import Link from "next/link";
import type { User } from "@prisma/client";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { logout, stopImpersonating } from "@/app/login/actions";
import { ROLES } from "@/lib/format";

export function AppShell({ user, impersonator, children }: { user: User; impersonator?: User | null; children: React.ReactNode }) {
  const links =
    user.role === "ADMIN"
      ? [
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/iscritti", label: "Iscritti" },
          { href: "/admin/corsi", label: "Corsi" },
          { href: "/calendario", label: "Calendario" },
          { href: "/admin/pagamenti", label: "Pagamenti" },
          { href: "/admin/utenti", label: "Utenti" },
        ]
      : [{ href: "/calendario", label: "Calendario" }];

  return (
    <div className="min-h-screen">
      {impersonator && (
        <div className="sticky top-0 z-50 bg-amber-400 text-amber-950 shadow">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <span>
              👁 Stai vedendo l&apos;app come <strong>{user.firstName} {user.lastName}</strong> ({ROLES[user.role]}). Le modifiche che
              fai vengono registrate come sue.
            </span>
            <form action={stopImpersonating}>
              <button className="rounded-lg bg-amber-950 px-3 py-1.5 font-semibold text-white hover:bg-black">
                Torna a {impersonator.firstName}
              </button>
            </form>
          </div>
        </div>
      )}
      <header className="brand-gradient text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href={user.role === "ADMIN" ? "/admin" : "/calendario"} className="rounded-lg bg-white/95 px-2 py-1">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">
              {user.firstName} {user.lastName} · <span className="text-white/70">{ROLES[user.role]}</span>
            </span>
            {!impersonator && (
              <Link href="/cambia-password" className="text-white/80 hover:text-white">
                Password
              </Link>
            )}
            <form action={logout}>
              <button className="rounded-lg bg-white/15 px-3 py-1.5 font-semibold hover:bg-white/25">Esci</button>
            </form>
          </div>
        </div>
        <NavLinks links={links} />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
