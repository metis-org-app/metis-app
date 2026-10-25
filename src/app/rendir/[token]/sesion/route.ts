import type { NextRequest } from 'next/server';
import { relaySubmissionRequest } from '@/features/submissions/server';

/*
 * The student's submission, read again by the submission screen (clock sync, after a 409). Under the link's path so
 * the browser sends the link's httpOnly cookie with the access key; the key never reaches the page.
 */
export async function GET(request: NextRequest, { params }: RouteContext<'/rendir/[token]/sesion'>) {
  return relaySubmissionRequest(request, (await params).token, 'read');
}
