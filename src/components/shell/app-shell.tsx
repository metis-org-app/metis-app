import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { MobileNav } from './mobile-nav';
import { NavLinks } from './nav-links';

/**
 * Signed-in frame: an ink sidebar (the landing's dark panel) and content on cream.
 * `account` is passed in so the layout can stream it behind its own Suspense boundary.
 */
export function AppShell({ account, children }: { account: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_1fr]">
      <MobileNav footer={account} />

      <aside className="sticky top-0 hidden h-dvh flex-col bg-ink px-4 py-6 text-paper lg:flex">
        <div className="px-2 pb-8">
          <Logo tone="paper" />
        </div>
        <nav aria-label="Principal" className="flex-1">
          <NavLinks />
        </nav>
        {account}
      </aside>

      <main id="contenido" className="min-w-0 px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
