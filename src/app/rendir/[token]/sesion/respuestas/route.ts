import type { NextRequest } from 'next/server';
import { relaySubmissionRequest } from '@/features/submissions/server';

/** Autosave of several responses at once (PUT /api/public/submissions/{accessKey}/responses). */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<'/rendir/[token]/sesion/respuestas'>,
) {
  return relaySubmissionRequest(request, (await params).token, 'save');
}
