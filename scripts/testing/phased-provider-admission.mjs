/** Fresh task-only current-reservation read. No recovery, writes, provider or profile logging. */
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readSwarmJournal} from '../../lib/server/society/swarm-journal.ts';
import {encodeMenuContext} from '../../lib/society/decision-menu.ts';
import {canonical} from '../../lib/experiments/validation.ts';
import {createSociety} from '../../lib/society/engine.ts';
import {controlledIds} from '../../lib/society/hybrid.ts';
const sha=value=>createHash('sha256').update(value).digest('hex');
const check=value=>{if(!value)throw Error('PHASED_ADMISSION_CURRENT_CONTEXT');};
function safe(root,path,bases){
 const full=resolve(path);check(bases.some(base=>full.startsWith(base+sep)));const actual=realpathSync(full);check(bases.some(base=>actual.startsWith(realpathSync(base)+sep)));
 for(let at=full;at!==root;at=resolve(at,'..')){check(!lstatSync(at).isSymbolicLink());check(resolve(at,'..')!==at);}return full;
}
/** Every later permit rechecks the persisted pending reservation and immutable input. */
export function verifyPreparedStoredContext({projectRoot,storageRoot,context,expected}){
 const root=realpathSync(resolve(projectRoot)),base=safe(root,storageRoot,[join(root,'tmp'),join(root,'data/derived')]),folder=safe(root,join(base,'session-store-v2/social-sessions'),[base]);
 const files=readdirSync(folder).filter(name=>name.endsWith('.jsonl'));check(files.length>0&&files.length<=16);let found;
 for(const name of files){
  check(/^[a-f0-9-]{36}\.jsonl$/.test(name));const path=safe(root,join(folder,name),[folder]),stat=lstatSync(path);check(stat.isFile()&&stat.size>0&&stat.size<=64*1024*1024);
  // Reader independently validates the existing persisted hash chain; no recovery is attempted.
  const state=readSwarmJournal(path),reservation=state.reservation;if(reservation?.id!==context.id||reservation.actor?.id!==context.actor?.id)continue;
  check(!found&&state.id+'.jsonl'===name&&state.runId===state.input.runId&&state.runId===reservation.runId&&state.runId===context.runId&&isDeepStrictEqual(state.hybrid.pending,reservation));
  check(isDeepStrictEqual(context,JSON.parse(encodeMenuContext(reservation)))&&controlledIds(createSociety(state.input)).includes(context.actor.id));
  const result={inputSha256:sha(canonical(state.input)),runSha256:sha(state.runId),selectionSha256:sha(canonical(state.input.citizenSelection)),contextSha256:sha(context.id),contextBodySha256:sha(canonical(context)),actorSha256:sha(context.actor.id),journalHeadSha256:sha(state.journalHead),revision:state.revision};
  check(!expected||(result.inputSha256===expected.inputSha256&&result.runSha256===expected.runSha256&&result.selectionSha256===expected.selectionSha256));found=result;
 }
 check(found);return Object.freeze(found);
}
