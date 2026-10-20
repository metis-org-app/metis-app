import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Ingresar' };

export default async function LoginPage({ searchParams }: PageProps<'/ingresar'>) {
  const { desde, motivo } = await searchParams;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl font-semibold">Hola de nuevo</h1>
        <p className="text-ink-soft">Ingresa para seguir con tus cursos y evaluaciones.</p>
      </header>

      {motivo === 'expirada' && <Alert>Tu sesión terminó. Ingresa de nuevo para continuar.</Alert>}

      <LoginForm redirectTo={typeof desde === 'string' ? desde : undefined} />

      <p className="text-sm text-ink-soft">
        ¿Primera vez en Metis?{' '}
        <Link href="/registro" className="font-semibold text-gold-ink underline-offset-4 hover:underline">
          Crea tu cuenta
        </Link>
      </p>
    </div>
  );
}
