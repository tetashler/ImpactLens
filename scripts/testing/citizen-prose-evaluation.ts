/** Public synthetic contract controls, not retained or reconstructed provider responses. */
import './offline-network.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';import {resolve,join,sep} from 'node:path';import {fileURLToPath} from 'node:url';
import {citizenV5Context,citizenV5Wire,addOwnedIssue} from '../../lib/contracts/tests/helpers/citizen-v5.ts';
import {decodeMenuDecision,encodeMenuContext} from '../../lib/society/decision-menu.ts';import {parseSocialDecision} from '../../lib/society/hybrid.ts';
export const proseCases=[
 ...['My working hours make public transport inconvenient.','I am worried about transfers after work.','One concern is whether transfers remain practical.','A second opinion about the station would help.','Could you double-check the shift schedule?','Hours of service matter for public transport access.'].map(text=>({text,expected:'legitimate',kind:null})),
 ...['One of my concerns is how transfers would work.','For one thing, the shift schedule needs clarification.','On the one hand, transfers might be easier.','One could ask about the proposed connection.','I have one suggestion about the proposed connection.'].map(text=>({text,expected:'legitimate',kind:null})), // Discourse-control variants
 ...['Could you explain the shift schedule?','I wonder whether the shift schedule can accommodate volunteers.'].map(text=>({text,expected:'legitimate',kind:'question'})),
 {text:'My participation depends on a workable shift schedule.',expected:'legitimate',kind:'condition'},
 {text:'I am not convinced about the shift schedule because coverage remains unclear.',expected:'legitimate',kind:'disagreement'},
 {text:'The shift schedule is still pending and I await confirmation.',expected:'legitimate',kind:'progress'},
 {text:'My condition is met because the shift schedule is confirmed before visits begin.',expected:'legitimate',kind:'resolve'},
 ...['My commute saves １５ minutes.','The line creates ten thousand jobs.','The line cuts travel time by a single minute.','The route takes an hr.','The line halves travel time.','My shift lasts an hour.','My schedule is on weekdays.','I am a nurse.','My workplace is Novena.','My neighbour works at a hospital.'].map(text=>({text,expected:'unsupported',kind:null})),
 {text:'My condition is met because the shift schedule is confirmed before visits begin. The shift schedule is not confirmed.',expected:'unsupported',kind:'resolve'},
 {text:"My condition isn't met because the shift schedule remains unclear.",expected:'unsupported',kind:'resolve'},
 {text:'Could you explain the catering arrangements?',expected:'unsupported',kind:'question'},
 ...['The shift schedule is pleasant.','Would the shift schedule be nice?','I prefer an easier shift schedule.'].map(text=>({text,expected:'ambiguous',kind:'question'})),
];
export function evaluateCitizenProse(){
 const rows=proseCases.map((row,index)=>{const outcomes=Object.fromEntries(['v5','v6'].map(version=>{const c:any=citizenV5Context();if(version==='v6')c.policy='conversation-menu-v6';if(['progress','resolve','withdraw'].includes(row.kind??''))addOwnedIssue(c);const option=row.kind?JSON.parse(encodeMenuContext(c)).issueOptions.find((o:any)=>o.kind===row.kind&&o.subjectId==='schedule'):null;
 try{if(row.kind&&!option)throw Error('CONTROL_OPTION_MISSING');const d=decodeMenuDecision({...citizenV5Wire(c),text:row.text,discussion:option?null:{topicIds:[],argument:'unspecified'},issueEvidenceId:option?.id??null},c);parseSocialDecision(d,c);return [version,{accepted:true,subreason:null}];}catch(e){return [version,{accepted:false,subreason:(e as any).diagnostic?.subreason??(e as any).rule??'CONTROL_FAILURE'}];}}));return {index,synthetic:true,...row,...outcomes};});
 const summary=Object.fromEntries(['v5','v6'].map(version=>[version,Object.fromEntries(['legitimate','unsupported','ambiguous'].map(expected=>{const selected=rows.filter(r=>r.expected===expected);return [expected,{total:selected.length,accepted:selected.filter(r=>(r as any)[version].accepted).length,rejected:selected.filter(r=>!(r as any)[version].accepted).length}];}))]));
 return {version:1,syntheticOnly:true,liveProviderEvidence:false,semanticVerification:'NOT_VERIFIED',summary,rows};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){const output=resolve(process.argv[2]??'tmp/citizen-prose-repair-20261101');if(!output.startsWith(resolve('tmp')+sep))throw Error('EVALUATION_OUTPUT');mkdirSync(output,{recursive:true});const result=evaluateCitizenProse();writeFileSync(join(output,'synthetic-evaluation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result.summary));if((result.summary as any).v6.legitimate.rejected||(result.summary as any).v6.unsupported.accepted||(result.summary as any).v6.ambiguous.accepted)process.exitCode=1;}
