import { getEldercareFacilities, eldercareError, EldercareApiError } from '../../../../lib/server/eldercare-service.ts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request):Promise<Response>{
  try{
    if(new URL(request.url).searchParams.size)throw new EldercareApiError('This catalogue endpoint accepts no query parameters.');
    return Response.json(getEldercareFacilities(),{headers:{'Cache-Control':'no-store'}});
  }catch(error){return eldercareError(error);}
}
