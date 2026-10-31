import {citizenImpactResponse} from '../../../lib/server/citizen-grounding/api.ts';

export const runtime='nodejs';
export async function POST(request:Request){return citizenImpactResponse(request);}
