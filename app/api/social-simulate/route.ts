import {handlePublicSocial} from '../../../lib/server/society/public-service';
export const runtime='nodejs';
export function GET(request:Request){return handlePublicSocial(request);}
export function POST(request:Request){return handlePublicSocial(request);}
