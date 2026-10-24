import type { Metadata } from 'next';
import { CreateAssessmentDialog, AssessmentList, StatusTabs, tabFor } from '@/features/assessments';
import { getAssessments } from '@/features/assessments/server';
import { requireUser } from '@/features/auth/server';

export const metadata: Metadata = { title: 'Evaluaciones' };

const EMPTY: Record<'Draft' | 'Published' | 'Archived', string> = {
  Draft: 'No tienes borradores.',
  Published: 'No tienes evaluaciones publicadas. Publica un borrador cuando sus preguntas estén listas.',
  Archived: 'No tienes evaluaciones archivadas.',
};

export default async function AssessmentsPage({ searchParams }: PageProps<'/evaluaciones'>) {
  await requireUser();
  const tab = tabFor((await searchParams).estado);
  const assessments = await getAssessments(tab.status);
  // The first-time explanation shows only when there is nothing anywhere, not on an empty tab.
  const firstTime =
    assessments.length === 0 &&
    tab.status === 'Draft' &&
    (await Promise.all([getAssessments('Published'), getAssessments('Archived')])).every(
      (list) => list.length === 0,
    );

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Evaluaciones</h1>
          <p className="text-ink-soft">Tus pruebas y guías, de borrador a publicadas.</p>
        </div>
        {!firstTime && <CreateAssessmentDialog />}
      </header>

      {firstTime ? (
        <section className="grid max-w-xl justify-items-start gap-4 rounded-surface border border-line bg-paper p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Todavía no tienes evaluaciones</h2>
          <p className="text-ink-soft">
            Empiezas con un borrador: le pones título, agregas preguntas de selección única, selección
            múltiple, verdadero o falso o respuesta abierta, y todo se guarda solo mientras escribes. Cuando
            esté lista, la publicas y queda fija para asignarla a tus cursos. Si después quieres cambiarla, la
            duplicas.
          </p>
          <p className="text-ink-soft">
            También puedes pedirle un borrador a Metis: le cuentas el tema, le subes tus materiales si
            quieres, y revisas las preguntas que propone antes de guardarlas.
          </p>
          <CreateAssessmentDialog />
        </section>
      ) : (
        <>
          <StatusTabs current={tab.status} />
          {assessments.length > 0 ? (
            <AssessmentList assessments={assessments} />
          ) : (
            <p className="rounded-surface border border-line bg-paper p-6 text-ink-soft">
              {EMPTY[tab.status]}
            </p>
          )}
        </>
      )}
    </div>
  );
}
