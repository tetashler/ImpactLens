import {handleDynamicRequest} from '../../../lib/server/inference/dynamic-service.ts';
export const runtime='nodejs';
export async function POST(request:Request){return handleDynamicRequest(request);}
