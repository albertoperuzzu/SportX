"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Messaggio di conferma mostrato prima dell'invio */
  confirm?: string;
};

export function SubmitButton({ children, className = "btn-primary", confirm, onClick, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {pending ? "Attendere…" : children}
    </button>
  );
}
