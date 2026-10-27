import { readAiAvailability } from '../../../../lib/server/ai/config.ts';
export const runtime='nodejs';
export async function GET(){return Response.json(readAiAvailability(),{headers:{'Cache-Control':'no-store'}});}
