'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import metis from '../../../../../public/metis.webp';

/** The wait while Metis writes. No progress bar: the API gives no progress, and a fake one would mislead. */
export function GeneratingScreen({ onCancel }: { onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // The form the teacher submitted is gone; keyboard focus moves to the only action left.
  useEffect(() => cancelRef.current?.focus(), []);

  return (
    <section
      aria-labelledby="generating-title"
      className="grid justify-items-center gap-6 rounded-surface border border-line bg-paper px-5 py-10 text-center sm:px-10"
    >
      <Image
        src={metis}
        alt="Ilustración de Metis, con una corona de laurel y un búho, trabajando en su computador"
        sizes="(min-width: 640px) 18rem, 14rem"
        className="w-56 sm:w-72"
      />
      <p id="generating-title" role="status" className="max-w-md text-lg font-semibold">
        Metis está preparando tu borrador. Puede tardar hasta un minuto.
      </p>
      <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
    </section>
  );
}
