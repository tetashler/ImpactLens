import {handleReportSummary} from '../../../../lib/server/report-summary';
export const runtime = 'nodejs';
export function GET(request: Request) {return handleReportSummary(request);}
export function POST(request: Request) {return handleReportSummary(request);}
