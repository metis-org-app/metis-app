import Image from 'next/image';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import metis from '../../../public/metis.webp';

/*
 * Sign-in and sign-up share one composition: the form on paper, and Metis on the dotted cream of
 * the landing hero. On small screens Metis steps back and the form comes first.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(28rem,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col bg-paper px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <main id="contenido" className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </main>
        <p className="text-sm text-ink-soft">
          Metis te ayuda a evaluar mejor. Tú decides qué llega a tus estudiantes.
        </p>
      </div>

      <aside
        aria-label="Metis"
        className="relative hidden overflow-hidden border-l border-line bg-cream lg:flex lg:flex-col lg:justify-center"
      >
        <div aria-hidden className="absolute inset-0 bg-dots opacity-60" />
        <div className="relative mx-auto grid max-w-lg gap-10 px-12">
          <Image
            src={metis}
            alt="Ilustración de Metis, con una corona de laurel y un búho, trabajando en su computador"
            priority
            sizes="(min-width: 1024px) 28rem, 0px"
            className="mx-auto w-full max-w-md"
          />
          <div className="grid gap-3">
            <p className="font-display text-4xl leading-[1.05] font-semibold xl:text-5xl">
              Evaluaciones con sabiduría.
            </p>
            <p className="max-w-md text-ink-soft">
              Sube tus materiales y Metis propone las preguntas. Mientras tus estudiantes responden, los guía
              con pistas, nunca con la respuesta.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
