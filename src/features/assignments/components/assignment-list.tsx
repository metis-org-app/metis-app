import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { availabilityDetail } from '../availability';
import type { AssignmentSummary } from '../contract';
import { AvailabilityBadge } from './availability-badge';
import { DatedSentence } from './local-date-time';

/**
 * Assignments of a course (each row names its assessment) or of an assessment (each row names its course).
 * Works in server components.
 */
export function AssignmentList({
  assignments,
  show,
}: {
  assignments: AssignmentSummary[];
  show: 'assessment' | 'workspace';
}) {
  return (
    <ul className="divide-y divide-line rounded-surface border border-line bg-paper">
      {assignments.map((assignment) => (
        <li key={assignment.id}>
          <Link
            href={`/asignaciones/${assignment.id}`}
            className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 transition-colors first:rounded-t-surface last:rounded-b-surface hover:bg-cream-deep sm:px-6"
          >
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold break-words group-hover:underline group-hover:underline-offset-4">
                {show === 'assessment' ? assignment.assessmentTitle : assignment.workspaceName}
              </span>
              <AvailabilityBadge availability={assignment.availability} />
            </span>
            <ChevronRight aria-hidden className="row-span-2 size-5 text-ink-soft" />
            <span className="text-sm text-ink-soft">
              <DatedSentence {...availabilityDetail(assignment)} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
