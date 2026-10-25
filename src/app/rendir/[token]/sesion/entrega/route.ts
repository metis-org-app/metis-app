import type { NextRequest } from 'next/server';
import { relaySubmissionRequest } from '@/features/submissions/server';

/** Submits the submission (POST /api/public/submissions/{accessKey}/submit), by hand or when time runs out. */
export async function POST(request: NextRequest, { params }: RouteContext<'/rendir/[token]/sesion/entrega'>) {
  return relaySubmissionRequest(request, (await params).token, 'submit');
}
