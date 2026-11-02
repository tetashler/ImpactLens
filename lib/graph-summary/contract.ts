import type {PublicExplore} from '../society/public-contract.ts';
import {canonical} from '../experiments/validation.ts';
import {projectGraphSummaryContext} from './evidence.ts';
export const GRAPH_SUMMARY_PROMPT_VERSION='graph-node-summaries-v2-conversations';
export const GRAPH_SUMMARY_BATCH_SIZE=12;
export interface GraphNodeSummary {nodeId:string;summary:string}
export interface GraphNodeSummaries {version:1;runId:string;snapshotKey:string;generatedAt:string;totalNodes:number;summaries:GraphNodeSummary[]}
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('GRAPH_SUMMARY_SHAPE');return value as Record<string,unknown>;}
function exact(value:Record<string,unknown>,keys:readonly string[]){if(Object.keys(value).sort().join(',')!==[...keys].sort().join(','))throw Error('GRAPH_SUMMARY_SHAPE');}
function summaries(value:unknown,allowed?:ReadonlySet<string>):GraphNodeSummary[]{
 if(!Array.isArray(value)||value.length>1500)throw Error('GRAPH_SUMMARY_SHAPE');
 const seen=new Set<string>();
 return value.map(item=>{const r=record(item);exact(r,['nodeId','summary']);if(typeof r.nodeId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,179}$/.test(r.nodeId)||seen.has(r.nodeId)||allowed&&!allowed.has(r.nodeId)||typeof r.summary!=='string'||!r.summary.trim()||r.summary.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(r.summary))throw Error('GRAPH_SUMMARY_TEXT');seen.add(r.nodeId);return {nodeId:r.nodeId,summary:r.summary.trim()};});
}
export function parseGraphNodeSummaries(value:unknown,allowedNodeIds?:ReadonlySet<string>):GraphNodeSummaries {
 const r=record(value);exact(r,['version','runId','snapshotKey','generatedAt','totalNodes','summaries']);
 if(r.version!==1||typeof r.runId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(r.runId)||typeof r.snapshotKey!=='string'||!/^[a-f0-9]{64}$/.test(r.snapshotKey)||typeof r.generatedAt!=='string'||r.generatedAt.length>32||!Number.isFinite(Date.parse(r.generatedAt))||!Number.isSafeInteger(r.totalNodes)||(r.totalNodes as number)<0||(r.totalNodes as number)>1500)throw Error('GRAPH_SUMMARY_IDENTITY');
 const parsed=summaries(r.summaries,allowedNodeIds);if(parsed.length>(r.totalNodes as number)||allowedNodeIds&&r.totalNodes!==allowedNodeIds.size)throw Error('GRAPH_SUMMARY_COVERAGE');
 return {version:1,runId:r.runId,snapshotKey:r.snapshotKey,generatedAt:r.generatedAt,totalNodes:r.totalNodes as number,summaries:parsed};
}
export function parseGraphNodeSummaryBatch(value:unknown,expectedIds:ReadonlySet<string>):GraphNodeSummary[]{const r=record(value);exact(r,['summaries']);const parsed=summaries(r.summaries,expectedIds);if(parsed.length!==expectedIds.size||parsed.length>GRAPH_SUMMARY_BATCH_SIZE)throw Error('GRAPH_SUMMARY_COVERAGE');return parsed;}
export function graphSummarySnapshotPayload(run:PublicExplore,promptVersion=GRAPH_SUMMARY_PROMPT_VERSION){return canonical({version:1,promptVersion,context:projectGraphSummaryContext(run)});}
