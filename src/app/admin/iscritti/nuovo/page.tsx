import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { createMember } from "../actions";
import { MemberFields } from "../MemberFields";

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<{ corso?: string }> }) {
  const { corso } = await searchParams;
  const courses = await prisma.course.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title="Nuovo iscritto" subtitle="Certificato medico e pagamenti si aggiungono dalla scheda dopo il salvataggio." />
      <div className="card">
        <ActionForm action={createMember} className="space-y-4">
          <MemberFields />
          <Field label="Iscrivi subito al corso" className="max-w-sm">
            <select name="courseId" defaultValue={corso ?? ""} className="input">
              <option value="">— Nessuno —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <SubmitButton className="btn-accent">Salva iscritto</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
