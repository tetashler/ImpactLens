import {controlledMrtResponse} from '../../../../lib/server/controlled-mrt.ts';

export const runtime='nodejs';
export async function POST(request:Request){return controlledMrtResponse(request);}
