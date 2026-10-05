import { AuthLayout } from "@/components/AuthLayout";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <AuthLayout title="Accedi" subtitle="Gestionale corsi e presenze">
      <ActionForm action={login} className="space-y-4">
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" className="input" autoFocus />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required autoComplete="current-password" className="input" />
        </Field>
        <SubmitButton className="btn-primary w-full">Entra</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-xs text-slate-500">
        Primo accesso? Usa la password che ti ha comunicato l&apos;associazione: ti verrà chiesto di sceglierne una nuova.
      </p>
    </AuthLayout>
  );
}
