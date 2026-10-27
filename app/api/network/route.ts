import { getNetworkCatalog, MapInputError } from '../../../lib/server/mrt-service.ts';
export const runtime = 'nodejs';
export async function GET(request: Request): Promise<Response> {
  try { return Response.json(getNetworkCatalog(new URL(request.url).searchParams.get('date') ?? '')); }
  catch (error) { return Response.json({ error: error instanceof MapInputError ? error.message : 'Unable to load MRT network' }, { status: error instanceof MapInputError ? 400 : 500 }); }
}
