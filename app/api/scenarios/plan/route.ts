import { handleScenarioRequest } from '../../../../lib/server/scenarios/service.ts';
export const runtime = 'nodejs';
export async function POST(request: Request) { return handleScenarioRequest(request); }
