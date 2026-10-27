import { handleAiRequest } from '../../../../lib/server/ai/service.ts';
export const runtime='nodejs';
export async function POST(request:Request){return handleAiRequest('explain',request);}
