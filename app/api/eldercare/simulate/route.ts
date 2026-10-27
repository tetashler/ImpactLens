import { calculateEldercare, readEldercareBody, eldercareError, EldercareApiError } from '../../../../lib/server/eldercare-service.ts';
export const runtime='nodejs';
export async function POST(request:Request):Promise<Response>{
  try{
    if(new URL(request.url).searchParams.size)throw new EldercareApiError('Put simulation settings in the JSON body only.');
    return Response.json(await calculateEldercare(await readEldercareBody(request)),{headers:{'Cache-Control':'no-store'}});
  }catch(error){return eldercareError(error);}
}
