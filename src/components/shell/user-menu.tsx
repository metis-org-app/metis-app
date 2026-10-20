'use client';

import { ChevronsUpDown, LogOut } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useTransition } from 'react';
import { logoutAction } from '@/features/auth';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [signingOut, startSignOut] = useTransition();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left text-paper transition-colors hover:bg-paper/8 focus-visible:outline-gold data-[state=open]:bg-paper/12">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-soft text-sm font-bold text-ink"
        >
          {initials(name)}
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className="truncate text-xs text-paper/60">{email}</span>
        </span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-paper/50" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 min-w-(--radix-dropdown-menu-trigger-width) rounded-control border border-line bg-paper p-1.5 text-ink shadow-[0_12px_32px_-12px_rgb(34_27_16/0.35)]"
        >
          {/* Selecting an item closes and unmounts the menu, so the action is called directly
              instead of submitting a form that would no longer be in the document. */}
          <DropdownMenu.Item
            disabled={signingOut}
            onSelect={() => startSignOut(() => logoutAction())}
            className="flex w-full cursor-default items-center gap-2.5 rounded-[0.55rem] px-3 py-2 text-sm outline-none data-disabled:opacity-60 data-highlighted:bg-cream-deep"
          >
            <LogOut aria-hidden className="size-4 text-ink-soft" />
            {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
