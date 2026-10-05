"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/forms";

type Props = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Svuota il form quando l'azione va a buon fine */
  resetOnSuccess?: boolean;
};

/** Form collegato a una server action che mostra errori/conferme restituiti dall'azione. */
export function ActionForm({ action, children, resetOnSuccess, ...rest }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} {...rest}>
      {children}
      {state?.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>}
    </form>
  );
}
