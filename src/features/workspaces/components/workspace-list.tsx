import { ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';

type WorkspaceSummary = { id: string; name: string; joinCode: string; studentCount: number };

export function studentCountLabel(count: number) {
  return count === 1 ? '1 estudiante' : `${count} estudiantes`;
}

/** List of courses linking to their page. Works in server components. */
export function WorkspaceList({
  workspaces,
  showCode = true,
}: {
  workspaces: WorkspaceSummary[];
  showCode?: boolean;
}) {
  return (
    <ul className="divide-y divide-line rounded-surface border border-line bg-paper">
      {workspaces.map((workspace) => (
        <li key={workspace.id}>
          <Link
            href={`/cursos/${workspace.id}`}
            className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors first:rounded-t-surface last:rounded-b-surface hover:bg-cream-deep sm:px-6"
          >
            <span className="font-semibold group-hover:underline group-hover:underline-offset-4">
              {workspace.name}
            </span>
            <ChevronRight aria-hidden className="row-span-2 size-5 text-ink-soft" />
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <Users aria-hidden className="size-4" />
                {studentCountLabel(workspace.studentCount)}
              </span>
              {showCode && (
                <span>
                  Código <span className="font-semibold tracking-wider text-ink">{workspace.joinCode}</span>
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
