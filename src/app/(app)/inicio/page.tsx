import type { Metadata } from 'next';
import { requireUser } from '@/features/auth/server';

export const metadata: Metadata = { title: 'Inicio' };

const STEPS = [
  {
    title: 'Arma tus cursos',
    body: 'Crea un curso y suma a tus estudiantes, o compárteles el código para que se unan.',
  },
  {
    title: 'Prepara una evaluación',
    body: 'Escríbela tú o sube tus materiales y pídele a Metis un borrador. Revisas y editas cada pregunta antes de publicar.',
  },
  {
    title: 'Asígnala y comparte el link',
    body: 'Defines el tiempo y cuánta ayuda puede dar Metis. Tus estudiantes responden desde cualquier dispositivo.',
  },
  {
    title: 'Revisa cómo les fue',
    body: 'Las preguntas cerradas se corrigen solas. Tú revisas las abiertas y ves en qué se quedaron pegados.',
  },
] as const;

export default async function HomePage() {
  const user = await requireUser();
  const firstName = user.name.split(/\s+/)[0] ?? user.name;

  return (
    <div className="grid gap-12">
      <header className="grid max-w-2xl gap-3">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Hola, {firstName}</h1>
        <p className="text-lg text-ink-soft">
          Aquí vas a ver lo que necesita tu atención: respuestas por revisar, evaluaciones abiertas y
          borradores. Mientras tanto, así funciona Metis.
        </p>
      </header>

      <section aria-labelledby="como-funciona" className="rounded-surface border border-line bg-paper">
        <h2 id="como-funciona" className="sr-only">
          Cómo funciona Metis
        </h2>
        <ol className="divide-y divide-line">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[2.25rem_1fr] gap-x-3 px-5 py-6 sm:grid-cols-[3rem_1fr] sm:gap-x-4 sm:px-8"
            >
              <span aria-hidden className="font-display text-3xl leading-none font-semibold text-gold-ink">
                {index + 1}
              </span>
              <div className="grid gap-1">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="max-w-prose text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
