import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main id="contenido" className="grid min-h-dvh place-items-center bg-cream px-6">
      <div className="grid max-w-md justify-items-start gap-6">
        <Logo />
        <h1 className="font-display text-4xl font-semibold">Esta página no existe</h1>
        <p className="text-ink-soft">Puede que el link esté incompleto o que la página se haya movido.</p>
        <Button asChild>
          <Link href="/inicio">Ir al inicio</Link>
        </Button>
      </div>
    </main>
  );
}
