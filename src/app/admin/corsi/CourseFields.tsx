import type { Course, User } from "@prisma/client";
import { Field } from "@/components/ui";
import { toDayString } from "@/lib/dates";

export function CourseFields({ course, instructors }: { course?: Course; instructors: User[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome corso" className="sm:col-span-2">
        <input name="name" required defaultValue={course?.name} className="input" placeholder="Es. Pilates base" />
      </Field>
      <Field label="Istruttore">
        <select name="instructorId" defaultValue={course?.instructorId ?? ""} className="input">
          <option value="">— Nessuno —</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.lastName} {i.firstName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Luogo / palestra">
        <input name="location" defaultValue={course?.location ?? ""} className="input" />
      </Field>
      <Field label="Data inizio">
        <input name="startDate" type="date" required defaultValue={course ? toDayString(course.startDate) : ""} className="input" />
      </Field>
      <Field label="Data fine">
        <input name="endDate" type="date" required defaultValue={course ? toDayString(course.endDate) : ""} className="input" />
      </Field>
      <Field label="Prezzo (€)">
        <input name="price" inputMode="decimal" defaultValue={course?.price?.toString() ?? ""} className="input" placeholder="Es. 40 al mese" />
      </Field>
      <Field label="Descrizione" className="sm:col-span-2">
        <textarea name="description" rows={2} defaultValue={course?.description ?? ""} className="input" />
      </Field>
    </div>
  );
}
