/** Synthetic contract screen, not provider performance or semantic intelligence. */
import {encodeMenuContext,decodeMenuDecision} from '../../lib/society/decision-menu.ts';
import {parseSocialDecision} from '../../lib/society/hybrid.ts';
import {citizenV5Context,citizenV5Wire} from '../../lib/contracts/tests/helpers/citizen-v5.ts';
const fixtures=[
 {group:'explicit-intent',kind:'question',text:'How would that fit around changing trains?'},
 {group:'explicit-intent',kind:'question',text:'Please explain the practical arrangements.'},
 {group:'explicit-intent',kind:'question',text:'I wonder what commuting would involve.'},
 {group:'explicit-intent',kind:'question',text:'Could someone explain the shift schedule?'},
 {group:'explicit-intent',kind:'condition',text:'That would determine whether I could participate.'},
 {group:'explicit-intent',kind:'condition',text:'My participation depends on a workable shift schedule.'},
 {group:'explicit-intent',kind:'disagreement',text:'I see it differently; the practical details remain unclear.'},
 {group:'explicit-intent',kind:'disagreement',text:'I am not convinced about the shift schedule because coverage is unclear.'},
 {group:'unsupported',kind:'question',text:'My commute saves 99 minutes.'},
 {group:'unsupported',kind:'condition',text:'I work at a hospital in Novena.'},
 {group:'unsupported',kind:'disagreement',text:'The line will create five jobs.'},
 {group:'unsupported',kind:'question',text:'My workplace is Novena.'},
 {group:'untracked',kind:null,text:'The gardens are pleasant.'},
 {group:'untracked',kind:null,text:'I am worried about transfers after work.'},
 {group:'untracked',kind:null,text:'Could someone explain the shift schedule?'},
] as const;
export function evaluateIssueDeclarations(){
 const rows=fixtures.map((f,index)=>{const outcomes=Object.fromEntries(['v6','v7'].map(version=>{const c:any={...citizenV5Context(),policy:'conversation-menu-'+version},e=JSON.parse(encodeMenuContext(c)),o=f.kind?e.issueOptions.find((o:any)=>o.kind===f.kind&&o.subjectId==='schedule'):null;
  try{const d=parseSocialDecision(decodeMenuDecision({...citizenV5Wire(c),text:f.text,discussion:o?null:{topicIds:[],argument:'unspecified'},issueEvidenceId:o?.id??null},c),c);return [version,{accepted:true,formalIssue:!!d.issueUpdate,authoredSpanEvidence:!!d.issueUpdate&&!d.issueUpdate.grounding?.declaration,selectedApplicationStatement:!!d.issueUpdate?.grounding?.declaration}];}
  catch{return [version,{accepted:false,formalIssue:false,authoredSpanEvidence:false,selectedApplicationStatement:false}];}
 }));return {fixture:index+1,group:f.group,kind:f.kind,...outcomes};});
 const summary=Object.fromEntries(['v6','v7'].map(v=>[v,Object.fromEntries(['explicit-intent','unsupported','untracked'].map(g=>{const r=rows.filter(x=>x.group===g);return [g,{total:r.length,accepted:r.filter(x=>(x as any)[v].accepted).length,formalIssues:r.filter(x=>(x as any)[v].formalIssue).length}];}))]));
 return {version:1,synthetic:true,liveProviderEvidence:false,paidCalls:0,summary,rows,limitations:['Explicit-intent fixtures assume the agent deliberately selects the displayed statement. V7 adopts it separately; v6 instead classifies an authored span. These are different contracts, not a measured live acceptance-rate comparison.','V7 does not verify semantic consistency between free prose and a selected declaration. Formal intention is the explicit finite selection; statement origin is always labelled.','Unsupported-language rejection remains a conservative lexical subset, not arbitrary-language truth verification.']};
}
