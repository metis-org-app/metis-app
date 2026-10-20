'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './nav-items';

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="grid gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-control px-3 py-2.5 text-[0.9375rem] text-paper/75 transition-colors hover:bg-paper/8 hover:text-paper focus-visible:outline-gold',
                active && 'bg-paper/12 font-semibold text-paper',
              )}
            >
              <Icon aria-hidden className={cn('size-[1.125rem]', active ? 'text-gold' : 'text-paper/60')} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
