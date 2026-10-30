import {handleSocialRequest} from '../../../lib/server/society/service';
export const runtime='nodejs';
export function GET(request:Request){return handleSocialRequest(request);}
export function POST(request:Request){return handleSocialRequest(request);}
