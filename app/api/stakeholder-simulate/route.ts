import {handleStakeholderRequest} from '../../../lib/server/stakeholder-simulation/service.ts';
export const runtime='nodejs';
export async function POST(request:Request){return handleStakeholderRequest(request);}
