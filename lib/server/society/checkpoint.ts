/** Materialised private state is an optimisation; the verified journal remains authoritative. */
import {readFileSync,existsSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {canonical,ensure,freezeSnapshot} from '../../experiments/validation.ts';
import {deepLimits,isDeep} from '../../society/deep-policy.ts';
import {replacePrivateCheckpoint} from './storage.ts';
import type {SwarmJournalState,readSwarmJournal} from './swarm-journal.ts';
import type {SocietyWorld} from '../../society/contract.ts';

const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
export const materialCheckpointPath=(root:string,id:string)=>join(root,id+'.materialized.json');
export async function writeMaterialCheckpoint(s:SwarmJournalState,root:string){
 if(!isDeep(s.world))return null;
 ensure(s.journalHead&&s.journalRecords===s.world.hybrid?.records.length,'SOCIAL_CHECKPOINT_BINDING');
 const journalBytes=statSync(join(root,s.id+'.jsonl')).size;
 const payload={format:1,policy:'deep-checkpoint-v1',id:s.id,runId:s.runId,revision:s.revision,tick:s.world.tick,recordCount:s.journalRecords,journalBytes,journalHead:s.journalHead,inputDigest:digest(s.world.genesis.input),stateDigest:digest(s.world),world:s.world};
 const text=JSON.stringify(payload),bytes=Buffer.byteLength(text);
 ensure(bytes<=deepLimits(s.world).checkpointBytes,'SOCIAL_CHECKPOINT_LIMIT');
 await replacePrivateCheckpoint(materialCheckpointPath(root,s.id),text);
 return {bytes,records:s.journalRecords,revision:s.revision};
}

/** Caller must verify the full journal hash chain before trying this optimisation. */
export function readMaterialCheckpoint(root:string,journal:ReturnType<typeof readSwarmJournal>):SocietyWorld|null{
 if(!isDeep(journal.input))return null;
 const path=materialCheckpointPath(root,journal.id);if(!existsSync(path))return null;
 try{
  ensure(statSync(path).size<=deepLimits(journal.input).checkpointBytes,'SOCIAL_CHECKPOINT_LIMIT');
  const c=JSON.parse(readFileSync(path,'utf8'));
  const frame=journal.frames.find(f=>f.offset===c.journalBytes);
  ensure(c.format===1&&c.policy==='deep-checkpoint-v1'&&c.id===journal.id&&c.runId===journal.runId,'SOCIAL_CHECKPOINT_BINDING');
  ensure(frame&&frame.head===c.journalHead&&frame.revision===c.revision&&frame.tick===c.tick&&frame.recordCount===c.recordCount,'SOCIAL_CHECKPOINT_BINDING');
  ensure(c.inputDigest===digest(journal.input)&&c.inputDigest===digest(c.world.genesis.input)&&c.stateDigest===digest(c.world),'SOCIAL_CHECKPOINT_BINDING');
  ensure(c.world.tick===c.tick&&c.recordCount===c.world.hybrid.records.length&&canonical(c.world.hybrid.records)===canonical(journal.hybrid.records.slice(0,c.recordCount)),'SOCIAL_CHECKPOINT_BINDING');
  ensure(c.world.version===1&&isDeep(c.world),'SOCIAL_CHECKPOINT_BINDING');
  return freezeSnapshot(c.world as SocietyWorld);
 }catch{return null;}
}
