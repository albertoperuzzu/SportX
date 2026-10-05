import type { Member } from "@prisma/client";
import { Field } from "@/components/ui";
import { toDayString } from "@/lib/dates";
import { CONTACT_STATUS } from "@/lib/format";

export function MemberFields({ member }: { member?: Member }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Nome *">
        <input name="firstName" required defaultValue={member?.firstName} className="input" />
      </Field>
      <Field label="Cognome *">
        <input name="lastName" required defaultValue={member?.lastName} className="input" />
      </Field>
      <Field label="Codice fiscale">
        <input name="fiscalCode" maxLength={16} defaultValue={member?.fiscalCode ?? ""} className="input uppercase" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={member?.email ?? ""} className="input" />
      </Field>
      <Field label="Telefono">
        <input name="phone" type="tel" defaultValue={member?.phone ?? ""} className="input" />
      </Field>
      <Field label="N. tessera">
        <input name="cardNumber" defaultValue={member?.cardNumber ?? ""} className="input" />
      </Field>
      <Field label="Data di nascita">
        <input name="birthDate" type="date" defaultValue={member?.birthDate ? toDayString(member.birthDate) : ""} className="input" />
      </Field>
      <Field label="Luogo di nascita">
        <input name="birthPlace" defaultValue={member?.birthPlace ?? ""} className="input" />
      </Field>
      <div />
      <Field label="Indirizzo">
        <input name="address" defaultValue={member?.address ?? ""} className="input" />
      </Field>
      <Field label="Città">
        <input name="city" defaultValue={member?.city ?? ""} className="input" />
      </Field>
      <Field label="CAP">
        <input name="zip" defaultValue={member?.zip ?? ""} className="input" />
      </Field>
      <Field label="Stato">
        <select name="contactStatus" defaultValue={member?.contactStatus ?? "ISCRITTO"} className="input">
          {Object.entries(CONTACT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Referente">
        <input name="referent" defaultValue={member?.referent ?? ""} className="input" placeholder="Es. NICO" />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="membershipForm" defaultChecked={member?.membershipForm} className="h-4 w-4" />
        Modulo di tesseramento firmato
      </label>
      <Field label="Note" className="sm:col-span-2 lg:col-span-3">
        <textarea
          name="notes"
          rows={Math.min(8, Math.max(2, (member?.notes ?? "").split("\n").length))}
          defaultValue={member?.notes ?? ""}
          className="input"
        />
      </Field>
    </div>
  );
}
