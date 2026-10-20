import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Metis Campus', template: '%s · Metis Campus' },
  description: 'Crea evaluaciones con IA y acompaña a tus estudiantes con Metis mientras responden.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#f7f0e3',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The CSP nonce set in proxy.ts is per request, so every page renders on demand.
  await connection();

  return (
    <html lang="es-CL">
      <body>
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
