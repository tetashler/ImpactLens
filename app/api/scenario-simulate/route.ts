import {handlePublicExplore} from '../../../lib/server/society/public-service.ts';
export const runtime='nodejs';
export async function POST(request:Request){return handlePublicExplore(request);}
