import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, PageHeader } from "@/components/ui";
import { INITIAL_PASSWORD, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/format";
import { createUser, impersonate, resetPassword, toggleActive, updateUser } from "./actions";
import { UserFields } from "./UserFields";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { lastName: "asc" }],
    include: { courses: { where: { active: true }, select: { name: true } } },
  });

  const instructors = users.filter((u) => u.active && u.role === "INSTRUCTOR");

  return (
    <>
      <PageHeader title="Utenti e istruttori" subtitle="Chi può accedere al gestionale" />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {users.map((u) => (
            <details key={u.id} className={`card p-0 ${u.active ? "" : "opacity-60"}`}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-4">
                <span className="font-semibold">
                  {u.lastName} {u.firstName}
                </span>
                <Badge color={u.role === "ADMIN" ? "purple" : "green"}>{ROLES[u.role]}</Badge>
                {!u.active && <Badge color="red">Disattivato</Badge>}
                {u.mustChangePassword && <Badge color="amber">Primo accesso da fare</Badge>}
                <span className="ml-auto text-sm text-slate-500">{u.email}</span>
                {u.courses.length > 0 && (
                  <span className="w-full text-xs text-slate-500">Corsi: {u.courses.map((c) => c.name).join(", ")}</span>
                )}
              </summary>
              <div className="border-t border-slate-100 p-4">
                <ActionForm action={updateUser} className="space-y-3">
                  <input type="hidden" name="id" value={u.id} />
                  <UserFields user={u} />
                  <SubmitButton>Salva</SubmitButton>
                </ActionForm>
                {u.id !== me.id && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {u.active && u.role === "INSTRUCTOR" && (
                      <form action={impersonate}>
                        <input type="hidden" name="id" value={u.id} />
                        <SubmitButton className="btn-secondary btn-sm">👁 Vedi come</SubmitButton>
                      </form>
                    )}
                    <form action={resetPassword}>
                      <input type="hidden" name="id" value={u.id} />
                      <SubmitButton
                        className="btn-secondary btn-sm"
                        confirm={`Reimpostare la password di ${u.firstName} a ${INITIAL_PASSWORD}?`}
                      >
                        Reimposta password
                      </SubmitButton>
                    </form>
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <SubmitButton className={u.active ? "btn-danger btn-sm" : "btn-secondary btn-sm"}>
                        {u.active ? "Disattiva accesso" : "Riattiva accesso"}
                      </SubmitButton>
                    </form>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>

        <div className="space-y-6">
          {instructors.length > 0 && (
            <div className="card">
              <h2 className="mb-1 font-bold">Vedi come istruttore</h2>
              <p className="mb-3 text-xs text-slate-500">
                Entri nell&apos;app con il suo account per vedere esattamente cosa vede. Puoi tornare indietro dalla barra in alto.
              </p>
              <form action={impersonate} className="flex gap-2">
                <select name="id" className="input" required>
                  {instructors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.lastName} {u.firstName}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn-secondary whitespace-nowrap">Vedi come</SubmitButton>
              </form>
            </div>
          )}
          <div className="card h-fit">
            <h2 className="mb-3 font-bold">Nuovo utente</h2>
            <ActionForm action={createUser} resetOnSuccess className="space-y-3">
              <UserFields />
              <p className="text-xs text-slate-500">
                Al primo accesso userà la password <strong>{INITIAL_PASSWORD}</strong> e dovrà sceglierne una nuova.
              </p>
              <SubmitButton className="btn-accent">Crea utente</SubmitButton>
            </ActionForm>
          </div>
        </div>
      </div>
    </>
  );
}
