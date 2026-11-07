import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFindingDrafts,parseReportFinding,parseReportEvidenceItem,validateFindingReferences,findingBasis} from '../../report-detailed/findings.ts';
import {buildFindingEvidenceCatalog,assembleFindingEvidence,hasHealthcareModelGap} from '../../server/report-detailed-findings.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {PublicDiscussionEvidence} from '../../report-summary/discussion-contract.ts';

const run=()=>({runId:'findings-run',question:'Would a proposed MRT improve journeys?',assumptions:['Static travel times'],limitations:['Estimates under assumptions'],sources:[{id:'metadata-only',title:'A title is not evidence',url:'https://example.org/title'}],session:{token:'PRIVATE_TOKEN'},demographics:{profile:'PRIVATE_PROFILE'},initialActions:[{id:'PRIVATE_INITIAL'}],assumptionReview:{items:[{assumptionId:'staffing',text:'The facility will be fully staffed.',decision:'do-not-allow'},{assumptionId:'opening',text:'Assume opening on the model service date.',decision:'allow'}]}} as unknown as PublicExplore);
const discussion=():PublicDiscussionEvidence=>({version:1,scope:'Accepted fictional public statements, not public opinion.',initialStatements:1,followupStatements:1,omitted:0,nodes:[],statements:[{id:'PRIVATE_RAW_INITIAL',actor:'Fictional resident',nodeIds:['PRIVATE_NODE'],phase:'initial',text:'Keep the walking route sheltered.'},{id:'PRIVATE_RAW_FOLLOWUP',actor:'Fictional operator',nodeIds:[],phase:'followup',text:'Opening hours need clarification.'}]});
const draft=(id:string)=>({text:'Access depends on the walking route.',supportIds:[id],limitations:['Fictional discussion is not public opinion.'],unresolvedDependencies:['A route accessibility assessment is missing.']});

test('finding parsers reject unknown keys, unsafe text, duplicate references and unbounded drafts',()=>{
 const value=draft('event-'+'a'.repeat(32));
 assert.deepEqual(parseFindingDrafts([value]),[value]);
 assert.deepEqual(parseFindingDrafts([]),[]);
 assert.deepEqual(parseReportFinding({id:'finding-1',...value}),{id:'finding-1',...value});
 for(const bad of [{...value,kind:'published'},{...value,text:'bad\u0000'}, {...value,supportIds:[]},{...value,supportIds:[value.supportIds[0],value.supportIds[0]]},{...value,limitations:[]},{...value,unresolvedDependencies:Array(5).fill('Gap')}])assert.throws(()=>parseFindingDrafts([bad]));
 assert.throws(()=>parseFindingDrafts(Array(6).fill(value)));
 assert.throws(()=>parseFindingDrafts(new Array(1)));assert.throws(()=>parseFindingDrafts([{...value,supportIds:new Array(1)}]));
 assert.throws(()=>parseFindingDrafts([{...value,[Symbol('private')]:'hidden'}]));
 assert.throws(()=>parseReportFinding({id:'finding-6',...value}));
});

test('catalog exposes only bounded public evidence and replaces raw discussion identifiers with stable opaque IDs',()=>{
 const before=run(),pack=discussion(),catalog=buildFindingEvidenceCatalog(before,pack),encoded=JSON.stringify(catalog);
 assert.doesNotMatch(encoded,/PRIVATE_|metadata-only|A title is not evidence|token|nodeIds|replyToId/);
 assert.equal(catalog.filter(e=>e.kind==='discussion-event').length,2);
 assert.deepEqual(catalog,buildFindingEvidenceCatalog(before,pack));
 before.runId='other-run';assert.notEqual(catalog.find(e=>e.kind==='discussion-event')!.id,buildFindingEvidenceCatalog(before,pack).find(e=>e.kind==='discussion-event')!.id);
 const same=discussion();same.statements=[same.statements[0],{...same.statements[0],id:'PRIVATE_SECOND_IDENTICAL'}];const distinct=buildFindingEvidenceCatalog(run(),same).filter(e=>e.kind==='discussion-event');assert.equal(distinct.length,2);assert.notEqual(distinct[0].id,distinct[1].id);assert.doesNotMatch(JSON.stringify(distinct),/PRIVATE_/);
 const rejected=catalog.find(e=>e.kind==='assumption'&&e.assumptionId==='staffing');assert.ok(rejected&&rejected.kind==='assumption');assert.equal(rejected.reviewStatus,'unknown');
 assert.match(rejected.limitations.join(' '),/not false|opposite/i);
 for(const entry of catalog)assert.deepEqual(parseReportEvidenceItem(entry),entry);
 assert.throws(()=>parseReportEvidenceItem({...catalog[0],profile:'PRIVATE'}));
});

test('published support requires the retained passage, preserves citation identity, and never upgrades source claims to verified facts',()=>{
 const value=run();value.research={sources:[{id:'retained-source',title:'Published plan',url:'https://example.org/plan',publisher:'example.org',publishedAt:null,retrievedAt:'2026-11-01T00:00:00.000Z',passage:'The published plan describes a proposed facility.'}],gaps:['Availability remains unverified.']} as any;
 const catalog=buildFindingEvidenceCatalog(value,discussion()),source=catalog.find(e=>e.kind==='source-passage');assert.ok(source&&source.kind==='source-passage');
 assert.equal(source.sourceId,'retained-source');assert.match(source.passageId,/^passage-[a-f0-9]{32}$/);assert.equal(source.text,'The published plan describes a proposed facility.');assert.match(source.limitations.join(' '),/published|unverified/i);
 assert.deepEqual(findingBasis(draft(source.id),catalog),['published']);
 assert.throws(()=>parseReportEvidenceItem({...source,text:'',title:'Only a title'}));
 assert.throws(()=>parseReportEvidenceItem({...source,url:'javascript:alert(1)'}));
 for(const url of ['http://example.org/plan','https://localhost/plan','https://127.0.0.1/plan','https://[::1]/plan','https://user:password@example.org/plan'])assert.throws(()=>parseReportEvidenceItem({...source,url}));
 value.research!.sources[0].passage='Different retained passage';assert.notEqual(source.id,buildFindingEvidenceCatalog(value,discussion()).find(e=>e.kind==='source-passage')!.id);
});

test('calculation evidence preserves signed estimates, units and comparable weighted denominator without individual records',()=>{
 const value=run();value.grounding={impact:{summary:{meanMinutesSaved:-2.5,benefitingShare:0.25,representedAgents:4,representedPopulation:100,comparableWeight:80,coverage:{improved:{agents:1,weight:20},unchanged:{agents:1,weight:20},worse:{agents:1,weight:40},unknown:{agents:1,weight:20},'newly-reachable':{agents:0,weight:0},unreachable:{agents:0,weight:0},'not-applicable':{agents:0,weight:0}}},assumptions:['Static routing'],sample:[{citizenId:'PRIVATE_CITIZEN'}]},limitations:['No demand response model']} as any;
 const catalog=buildFindingEvidenceCatalog(value,discussion()),mean=catalog.find(e=>e.kind==='calculation'&&e.metric==='meanMinutesSaved');assert.ok(mean&&mean.kind==='calculation');
 assert.equal(mean.value,-2.5);assert.equal(mean.unit,'minutes');assert.equal(mean.denominator,80);assert.match(mean.denominatorLabel!,/comparable.*weight/i);assert.deepEqual(mean.assumptions,['Static routing']);assert.doesNotMatch(JSON.stringify(catalog),/PRIVATE_CITIZEN/);
 value.grounding!.impact.summary.meanMinutesSaved=null;assert.ok(!buildFindingEvidenceCatalog(value,discussion()).some(e=>e.kind==='calculation'&&e.metric==='meanMinutesSaved'));
 assert.throws(()=>parseReportEvidenceItem({...mean,value:Infinity}));
});

test('assembler validates references and stores only cited catalog evidence with server assigned finding IDs',()=>{
 const catalog=buildFindingEvidenceCatalog(run(),discussion()),event=catalog.find(e=>e.kind==='discussion-event')!;
 const result=assembleFindingEvidence([draft(event.id)],catalog);assert.equal(result.findings[0].id,'finding-1');assert.deepEqual(result.evidence,[event]);
 assert.deepEqual(findingBasis(result.findings[0],result.evidence),['fictional']);assert.doesNotThrow(()=>validateFindingReferences(result.findings,result.evidence));
 assert.throws(()=>assembleFindingEvidence([draft('missing-id')],catalog));assert.throws(()=>assembleFindingEvidence([draft(event.id)],[...catalog,catalog[0]]));
 assert.throws(()=>validateFindingReferences(result.findings,[]));assert.throws(()=>validateFindingReferences([...result.findings,...result.findings],result.evidence));
});

test('healthcare service effect remains a mandatory explicit unknown even when generated findings omit it',()=>{
 const value=run();value.locationContext={interventionType:'new_polyclinic'} as any;const catalog=buildFindingEvidenceCatalog(value,discussion());assert.equal(hasHealthcareModelGap(catalog),true);
 const result=assembleFindingEvidence([],catalog);assert.equal(result.findings.length,1);assert.match(result.findings[0].text,/waiting.time.*unknown|unknown.*waiting.time/i);assert.match(result.findings[0].unresolvedDependencies.join(' '),/service model/i);assert.equal(result.evidence[0].kind,'model-limitation');assert.deepEqual(findingBasis(result.findings[0],result.evidence),['unknown']);
 const event=catalog.find(e=>e.kind==='discussion-event')!;assert.equal(assembleFindingEvidence(Array.from({length:4},()=>draft(event.id)),catalog).findings.length,5);
 assert.throws(()=>assembleFindingEvidence(Array.from({length:5},()=>draft(event.id)),catalog));
});

test('catalog and stored selections enforce whole UTF-8 byte limits and category caps',()=>{
 const pack=discussion();pack.statements=Array.from({length:100},(_,i)=>({id:`raw-${i}`,actor:'Fictional participant',nodeIds:[],phase:'followup' as const,text:`${i}:`+'界'.repeat(1600)}));
 const catalog=buildFindingEvidenceCatalog(run(),pack);assert.ok(catalog.length<=80);assert.ok(Buffer.byteLength(JSON.stringify(catalog))<=100000);assert.ok(catalog.filter(e=>e.kind==='discussion-event').every(e=>e.text.length<=900));
 assert.ok(catalog.filter(e=>e.kind==='discussion-event').length<=40);
 assert.ok(catalog.filter(e=>e.kind==='discussion-event').every(e=>/bounded|truncated/i.test(e.limitations.join(' '))),'catalog trimming must remain inspectable even when the internal pack omitted no statements');
});
