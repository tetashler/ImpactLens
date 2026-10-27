import { parseCsv } from '../csv.ts';
import type { Feed } from '../gtfs.ts';

export function fixture(): Feed {
  const csv = {
    agency: 'agency_id,agency_name,agency_url,agency_timezone\nA,Agency,https://example.org,Asia/Singapore',
    stops: 'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\nNS4,Choa Chu Kang,1.38,103.74,1,\nBP1,Choa Chu Kang,1.38,103.74,1,\nX,Other,1.4,103.8,1,\nY,Other,1.41,103.81,1,\nNS4_A,Choa Chu Kang,1.38,103.74,0,NS4\nBP1_A,Choa Chu Kang,1.38,103.74,0,BP1\nX_A,Other,1.4,103.8,0,X\nY_A,Other,1.41,103.81,0,Y',
    routes: 'route_id,agency_id,route_short_name,route_type\nR,A,NS,1\nB,A,BP,0',
    trips: 'trip_id,route_id,service_id\nT1,R,WD\nT2,R,WD\nT3,R,WD\nTB,B,WD\nSAT,R,SAT',
    stop_times: 'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,5:00:00,5:00:20,NS4_A,1\nT1,5:02:00,5:02:20,X_A,2\nT2,6:00:00,6:00:30,NS4_A,1\nT2,6:03:00,6:03:20,X_A,2\nT3,7:00:00,7:00:40,NS4_A,1\nT3,7:10:00,7:10:20,X_A,2\nTB,5:00:00,5:00:00,BP1_A,1\nTB,5:01:00,5:01:00,Y_A,2\nSAT,5:00:00,5:00:00,X_A,1\nSAT,5:01:00,5:01:00,NS4_A,2',
    calendar: 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nWD,1,1,1,1,1,0,0,20260101,20261231\nSAT,0,0,0,0,0,1,0,20260101,20261231',
    calendar_dates: 'service_id,date,exception_type',
    feed_info: 'feed_publisher_name,feed_publisher_url,feed_lang\nExample,https://example.org,en',
  };
  return { tables: Object.fromEntries(Object.entries(csv).map(([k, v]) => [k, parseCsv(v).rows])) as Feed['tables'], hashes: {}, root: 'fixture' };
}
