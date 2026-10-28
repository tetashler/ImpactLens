import { handleEvidenceResearch } from '../../../../lib/server/evidence/service.ts';

export const runtime = 'nodejs';
export async function POST(request: Request) { return handleEvidenceResearch(request); }
