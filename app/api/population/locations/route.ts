import {buildSocietyGeography} from '../../../../lib/server/population/geography';
export const runtime='nodejs';
export function GET(){try{return Response.json(buildSocietyGeography(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'The existing subzone geometry could not be prepared safely.'},{status:503});}}
