import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { AssessmentStatus } from '../contract';

export const STATUS_TABS = [
  { status: 'Draft', param: 'borradores', label: 'Borradores' },
  { status: 'Published', param: 'publicadas', label: 'Publicadas' },
  { status: 'Archived', param: 'archivadas', label: 'Archivadas' },
] as const satisfies { status: AssessmentStatus; param: string; label: string }[];

export type StatusParam = (typeof STATUS_TABS)[number]['param'];

/** The tab for a `?estado=` value; drafts when it is missing or unknown. */
export function tabFor(param: string | string[] | undefined) {
  return STATUS_TABS.find((tab) => tab.param === param) ?? STATUS_TABS[0];
}

/*
 * Links rather than ARIA tabs: each tab is its own URL (shareable, works without JavaScript) and the current one is
 * marked with aria-current, like the main navigation.
 */
export function StatusTabs({ current }: { current: AssessmentStatus }) {
  return (
    <nav aria-label="Estado de las evaluaciones">
      <ul className="flex gap-1 border-b border-line">
        {STATUS_TABS.map((tab) => {
          const active = tab.status === current;
          return (
            <li key={tab.status}>
              <Link
                href={`/evaluaciones?estado=${tab.param}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px inline-flex min-h-11 items-center border-b-2 px-4 font-semibold whitespace-nowrap transition-colors',
                  active ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink',
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
