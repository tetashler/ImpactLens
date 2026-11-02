import {handleDetailedReport} from '../../../../lib/server/report-detailed';

export const runtime = 'nodejs';
export function GET(request: Request) {return handleDetailedReport(request);}
export function POST(request: Request) {return handleDetailedReport(request);}
