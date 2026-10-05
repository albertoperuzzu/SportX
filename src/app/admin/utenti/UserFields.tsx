import type { User } from "@prisma/client";
import { Field } from "@/components/ui";

export function UserFields({ user }: { user?: User }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome">
        <input name="firstName" required defaultValue={user?.firstName} className="input" />
      </Field>
      <Field label="Cognome">
        <input name="lastName" required defaultValue={user?.lastName} className="input" />
      </Field>
      <Field label="Email (per il login)">
        <input name="email" type="email" required defaultValue={user?.email} className="input" />
      </Field>
      <Field label="Telefono">
        <input name="phone" type="tel" defaultValue={user?.phone ?? ""} className="input" />
      </Field>
      <Field label="Ruolo">
        <select name="role" defaultValue={user?.role ?? "INSTRUCTOR"} className="input">
          <option value="INSTRUCTOR">Istruttore</option>
          <option value="ADMIN">Admin</option>
        </select>
      </Field>
    </div>
  );
}
