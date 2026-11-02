import {handleAssumptionRequest} from '../../../lib/server/assumption-review/service.ts';
export const runtime='nodejs';
export async function POST(request:Request){return handleAssumptionRequest(request);}
