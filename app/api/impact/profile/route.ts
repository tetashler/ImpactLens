import { getImpactProfile, impactError, ImpactApiError } from '../../../../lib/server/impact-api-service.ts';
export const runtime='nodejs';
export async function GET(request:Request):Promise<Response> {
  try{
    const url=new URL(request.url);
    if([...url.searchParams.keys()].some(k=>!['runId','requestId','agentId'].includes(k))||['runId','requestId','agentId'].some(k=>url.searchParams.getAll(k).length!==1))throw new ImpactApiError('Supply one run, request and synthetic citizen identifier.');
    return Response.json(getImpactProfile(url.searchParams.get('runId')!,url.searchParams.get('requestId')!,url.searchParams.get('agentId')!),{headers:{'Cache-Control':'no-store'}});
  }catch(error){return impactError(error);}
}
