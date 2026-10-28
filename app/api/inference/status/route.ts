import {inferenceStatus} from '../../../../lib/server/inference/service.ts';
export const runtime='nodejs';
export async function GET(){return Response.json(inferenceStatus(),{headers:{'Cache-Control':'no-store'}});}
