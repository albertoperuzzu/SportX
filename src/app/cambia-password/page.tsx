import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { changePassword } from "../login/actions";
import { AuthLayout } from "@/components/AuthLayout";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AuthLayout
      title={user.mustChangePassword ? `Benvenuto/a, ${user.firstName}!` : "Cambia password"}
      subtitle={user.mustChangePassword ? "Scegli la tua password personale per continuare." : undefined}
    >
      <ActionForm action={changePassword} className="space-y-4">
        <Field label="Password attuale">
          <input name="current" type="password" required autoComplete="current-password" className="input" />
        </Field>
        <Field label="Nuova password (min. 8 caratteri)">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        </Field>
        <Field label="Ripeti nuova password">
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
        </Field>
        <SubmitButton className="btn-primary w-full">Salva password</SubmitButton>
      </ActionForm>
      {!user.mustChangePassword && (
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="link">
            Annulla
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
