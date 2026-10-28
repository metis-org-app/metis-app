import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/features/auth';
import { getChallenge } from '@/features/auth/server';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default async function RegisterPage() {
  const pending = await getChallenge();

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl font-semibold">Crea tu cuenta</h1>
        <p className="text-ink-soft">Solo necesitas tu email. Sin contraseñas.</p>
      </header>

      <RegisterForm pendingEmail={pending?.kind === 'signUp' ? pending.email : undefined} />

      <p className="text-sm text-ink-soft">
        ¿Ya tienes cuenta?{' '}
        <Link href="/ingresar" className="font-semibold text-gold-ink underline-offset-4 hover:underline">
          Ingresa
        </Link>
      </p>
    </div>
  );
}
