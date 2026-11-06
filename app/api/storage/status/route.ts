import {handleStorageStatus} from '../../../../lib/server/society/storage-status.ts';
export const runtime='nodejs';
export function GET(request:Request){return handleStorageStatus(request);}
