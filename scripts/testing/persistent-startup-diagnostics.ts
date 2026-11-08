/** Drain child streams while retaining only public, allowlisted startup error codes. */
import type {ChildProcess} from 'node:child_process';
const codes=new Set(['DEPLOYMENT_NODE','DEPLOYMENT_MODE','DEPLOYMENT_PORT','DEPLOYMENT_STATE_CONFIG','DEPLOYMENT_STATE_PATH','DEPLOYMENT_ENV_FILE','DEPLOYMENT_RELEASE','DEPLOYMENT_STATE_WRITABLE','DEPLOYMENT_LOCK_CONFIG','DEPLOYMENT_ARGUMENTS','DEPLOYMENT_UNAVAILABLE']);
export function observeStartup(child:Pick<ChildProcess,'stdout'|'stderr'>):()=>string {
 const found=new Set<string>();
 for(const stream of [child.stdout,child.stderr]){
  let tail='';
  stream?.on('data',chunk=>{const text=tail+String(chunk);for(const match of text.matchAll(/\bDEPLOYMENT_[A-Z_]+\b/g))if(codes.has(match[0]))found.add(match[0]);tail=text.slice(-128);});
 }
 return ()=>[...found].join(', ')||'no recognised deployment code';
}
