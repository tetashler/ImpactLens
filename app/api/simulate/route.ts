import { runMapSimulation, MapInputError } from '../../../lib/server/mrt-service.ts';
export const runtime = 'nodejs';
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
  try { return Response.json(runMapSimulation(payload)); }
  catch (error) { return Response.json({ error: error instanceof MapInputError ? error.message : 'Unable to simulate MRT proposal' }, { status: error instanceof MapInputError ? 400 : 500 }); }
}
