import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Rendered inside the AppShell (e.g. a course that does not exist or belongs to another teacher), so it has no page
// frame of its own, unlike the root not-found.
export default function SignedInNotFound() {
  return (
    <div className="grid max-w-xl justify-items-start gap-4">
      <h1 className="font-display text-4xl font-semibold">No encontramos esta página</h1>
      <p className="text-ink-soft">
        Puede que el link esté incompleto, que la hayan borrado o que no tengas acceso a ella.
      </p>
      <Button asChild>
        <Link href="/cursos">Ir a tus cursos</Link>
      </Button>
    </div>
  );
}
