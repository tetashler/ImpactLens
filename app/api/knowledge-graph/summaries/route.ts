import {handleGraphNodeSummaries} from '../../../../lib/server/graph-node-summaries';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleGraphNodeSummaries(request);}
export async function POST(request:Request){return handleGraphNodeSummaries(request);}
