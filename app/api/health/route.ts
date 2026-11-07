/** Liveness only. Capacity, provider availability and simulations are independent. */
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(){return Response.json({version:1,status:'ok'},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
