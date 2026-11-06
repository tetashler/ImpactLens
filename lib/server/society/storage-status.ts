import {getStorageCapacity} from './storage-admission.ts';
import {parseStorageCapacityStatus,unavailableStorageCapacity} from '../../society/storage-status.ts';

interface StatusDependencies {base?:string;read?:()=>unknown}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
/** Passive endpoint: no browser-selected directories, filesystem probes, recovery or maintenance. */
export function handleStorageStatus(request:Request,deps:StatusDependencies={}):Response {
 try{
  const url=new URL(request.url),origin=request.headers.get('origin');
  if(request.method!=='GET')return json({error:'STORAGE_STATUS_METHOD'},405);
  if(url.search||request.body!==null)return json({error:'STORAGE_STATUS_REQUEST'},400);
  const localOrigin=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin;
  if(origin&&origin!==localOrigin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'STORAGE_STATUS_ACCESS'},403);
  return json(parseStorageCapacityStatus(deps.read?deps.read():getStorageCapacity(deps.base)));
 }catch{return json(unavailableStorageCapacity());}
}
