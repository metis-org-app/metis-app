'use client';

import { Button } from '@/components/ui/button';

export default function SignedInError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="grid max-w-xl gap-4">
      <h1 className="font-display text-3xl font-semibold">No pudimos cargar esta sección</h1>
      <p className="text-ink-soft">
        Metis no respondió a tiempo. Vuelve a intentarlo; si sigue pasando, revisa tu conexión.
      </p>
      <div>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
