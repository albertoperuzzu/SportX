import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { createCourse } from "../actions";
import { CourseFields } from "../CourseFields";

export default async function NewCoursePage() {
  const instructors = await prisma.user.findMany({ where: { active: true }, orderBy: { lastName: "asc" } });
  return (
    <>
      <PageHeader title="Nuovo corso" subtitle="Dopo averlo creato potrai aggiungere gli orari settimanali e gli iscritti." />
      <div className="card max-w-2xl">
        <ActionForm action={createCourse} className="space-y-4">
          <CourseFields instructors={instructors} />
          <SubmitButton className="btn-accent">Crea corso</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
