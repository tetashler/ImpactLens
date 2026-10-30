export const runtime='nodejs';
export async function POST(_request:Request){return Response.json({error:'Synthetic conversation endpoints are no longer public. Use Knowledge Graph and Report summaries.'},{status:410});}
