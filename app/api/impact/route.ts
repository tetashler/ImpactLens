import { calculateImpact, readImpactBody, impactError } from '../../../lib/server/impact-api-service.ts';
export const runtime='nodejs';
export async function POST(request:Request):Promise<Response> {
  try{return Response.json(await calculateImpact(await readImpactBody(request)),{headers:{'Cache-Control':'no-store'}});}
  catch(error){return impactError(error);}
}
