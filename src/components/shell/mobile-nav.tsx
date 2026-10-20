'use client';

import { Menu, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { NavLinks } from './nav-links';

/** Below `lg` the sidebar becomes a top bar with a drawer. */
export function MobileNav({ footer }: { footer: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-paper/10 bg-ink px-4 py-3 lg:hidden">
      <Logo tone="paper" />
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          aria-label="Abrir menú"
          className="grid size-10 place-items-center rounded-control text-paper hover:bg-paper/10 focus-visible:outline-gold"
        >
          <Menu aria-hidden className="size-5" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-ink p-4 text-paper focus:outline-none">
            <div className="mb-6 flex items-center justify-between">
              <Dialog.Title asChild>
                <span>
                  <Logo tone="paper" />
                </span>
              </Dialog.Title>
              <Dialog.Close
                aria-label="Cerrar menú"
                className="grid size-10 place-items-center rounded-control hover:bg-paper/10 focus-visible:outline-gold"
              >
                <X aria-hidden className="size-5" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Navegación principal</Dialog.Description>
            <nav aria-label="Principal" className="flex-1">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            {footer}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
