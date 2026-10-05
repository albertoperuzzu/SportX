"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";
import { parseDay, todayString, toDayString } from "@/lib/dates";
import { computeEndDate, SUBSCRIPTION_RULES, SUBSCRIPTION_TYPES, type SubscriptionType } from "@/lib/subscriptions";
import type { ActionState } from "@/lib/forms";

export type EnrollmentOption = { id: string; courseName: string; prices: Partial<Record<SubscriptionType, string>> };

const TYPES = Object.keys(SUBSCRIPTION_TYPES) as SubscriptionType[];

/** Form nuovo abbonamento: propone data di fine e prezzo di listino, entrambi modificabili. */
export function SubscriptionForm({
  enrollments,
  action,
}: {
  enrollments: EnrollmentOption[];
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [enrollmentId, setEnrollmentId] = useState(enrollments[0]?.id ?? "");
  const [type, setType] = useState<SubscriptionType>("MENSILE");
  const [start, setStart] = useState(todayString());
  const [end, setEnd] = useState(() => toDayString(computeEndDate("MENSILE", parseDay(todayString()))));
  const [price, setPrice] = useState(enrollments[0]?.prices.MENSILE ?? "");

  const refresh = (nextType: SubscriptionType, nextStart: string, nextEnrollment: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(nextStart)) setEnd(toDayString(computeEndDate(nextType, parseDay(nextStart))));
    setPrice(enrollments.find((e) => e.id === nextEnrollment)?.prices[nextType] ?? "");
  };

  return (
    <ActionForm action={action} className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Field label="Corso">
        <select
          name="enrollmentId"
          value={enrollmentId}
          onChange={(e) => {
            setEnrollmentId(e.target.value);
            refresh(type, start, e.target.value);
          }}
          className="input"
        >
          {enrollments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.courseName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tipo">
        <select
          name="type"
          value={type}
          onChange={(e) => {
            const t = e.target.value as SubscriptionType;
            setType(t);
            refresh(t, start, enrollmentId);
          }}
          className="input"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {SUBSCRIPTION_TYPES[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Inizio">
        <input
          name="startDate"
          type="date"
          required
          value={start}
          onChange={(e) => {
            setStart(e.target.value);
            refresh(type, e.target.value, enrollmentId);
          }}
          className="input"
        />
      </Field>
      <Field label="Fine">
        <input name="endDate" type="date" required value={end} onChange={(e) => setEnd(e.target.value)} className="input" />
      </Field>
      <Field label="Prezzo €">
        <input name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
      </Field>
      <Field label="Note">
        <input name="notes" className="input" />
      </Field>
      <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">
        {SUBSCRIPTION_TYPES[type]}: {SUBSCRIPTION_RULES[type]}. Il pagamento si registra a parte, qui sotto.
      </p>
      <div className="sm:col-span-1 lg:col-span-2">
        <SubmitButton className="btn-accent w-full">Aggiungi abbonamento</SubmitButton>
      </div>
    </ActionForm>
  );
}
