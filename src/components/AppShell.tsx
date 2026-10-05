import Link from "next/link";
import type { User } from "@prisma/client";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { logout } from "@/app/login/actions";
import { ROLES } from "@/lib/format";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
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
      <header className="brand-gradient text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href={user.role === "ADMIN" ? "/admin" : "/calendario"} className="rounded-lg bg-white/95 px-2 py-1">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">
              {user.firstName} {user.lastName} · <span className="text-white/70">{ROLES[user.role]}</span>
            </span>
            <Link href="/cambia-password" className="text-white/80 hover:text-white">
              Password
            </Link>
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
