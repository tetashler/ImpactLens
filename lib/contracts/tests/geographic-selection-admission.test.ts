import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readSync,openSync,closeSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {canonical} from '../../experiments/validation.ts';
import {createSociety} from '../../society/engine.ts';
import {prepareHybridStep} from '../../society/hybrid.ts';
import {encodeMenuContext} from '../../society/decision-menu.ts';

const root=process.cwd();
const helperPath='../../../scripts/testing/geographic-selection-admission.mjs';
const helper=await import(helperPath).catch(()=>({}));
test('exports read-only geographic selection admission and pinned preloader',()=>{
 assert.equal(typeof helper.inspectFrozenGeographicSelection,'function');
 assert.equal(typeof helper.verifyGeographicSelectionAdmission,'function');
 assert.equal(typeof helper.preloadGeographicSelectionProof,'function');
});
// Only the genesis row is read: this suite never replays the 350-decision fixture.
function genesis(){
 const menu=JSON.parse(readFileSync(join(root,'tmp/citizen-selection-v2-20261101/integration/citizen-menu-50.json'),'utf8'));
 const fd=openSync(menu.rows[0].sourceJournal,'r'),buffer=Buffer.alloc(1024*1024);let raw='';
 try{for(;;){const n=readSync(fd,buffer);assert.ok(n>0);raw+=buffer.subarray(0,n).toString('utf8');if(raw.includes('\n'))break;}}finally{closeSync(fd);}
 return JSON.parse(raw.slice(0,raw.indexOf('\n'))).input;
}
let fixture:any;
function inputFixture(){
 if(fixture)return structuredClone(fixture);
 const input=genesis(),dataset=JSON.parse(readFileSync(join(root,'data/synthetic',input.citizenGrounding.datasetId+'.json'),'utf8'));
 const selected=new Map(input.citizenGrounding.profiles.map((p:any)=>[p.citizen.id,p.commute]));
 // Synthetic selector-only facts outside the selected set. Not a routing proof;
 // the IO boundary separately validates every real full-run fact and its SHA.
 const run={citizenDatasetId:dataset.id,populationId:dataset.populationId,scenarioFingerprint:input.citizenSelection.scenarioFingerprint,
  facts:dataset.records.map((r:any)=>selected.get(r.id)??{citizenId:r.id,citizenDatasetId:dataset.id,populationId:dataset.populationId,scenarioFingerprint:input.citizenSelection.scenarioFingerprint,status:'unknown',minutesSaved:null})};
 fixture={input,proof:{dataset,run,binding:input.citizenGrounding.hybridBinding}};
 return structuredClone(fixture);
}
test('actual frozen fixture has 50 agents, four capable beneficiaries and broad comparison',()=>{
 const f=inputFixture(),before=canonical(f);const receipt=helper.inspectFrozenGeographicSelection(f.input,f.proof);
 assert.deepEqual(receipt.byBucket,{impact:4,geography:12,comparison:34,fallback:0});
 assert.equal(receipt.active,50);assert.equal(receipt.capable,35);assert.equal(receipt.ruleDriven,15);
 assert.equal(receipt.improvedSelected,4);assert.equal(receipt.improvedCapable,4);
 assert.ok(receipt.comparisonAreas>=25);assert.equal(canonical(f),before);
 assert.doesNotMatch(JSON.stringify(receipt),/citizen-|profiles|homeProxy|jobTitle|PRIVATE_/);
});
for(const [name,mutate] of [
 ['stale accepted binding',(f:any)=>{f.proof.binding.anchors={'stop-0':'NS4','stop-2':'NE15'};}],
 ['missing beneficiary',(f:any)=>{f.input.citizenSelection.members.shift();}],
 ['source fact mismatch',(f:any)=>{f.input.citizenGrounding.profiles[0].commute.sourceIds=['forged-source'];}],
 ['authoritative citizen mismatch',(f:any)=>{f.input.citizenGrounding.profiles[0].citizen.jobTitle='FORGED_PRIVATE_JOB';}],
 ['forged selection metadata',(f:any)=>{f.input.citizenSelection.availableNear++;}],
 ['changed national population weights',(f:any)=>{f.input.population.sampleSize=50;}],
] as const)test('rejects '+name,()=>{const f=inputFixture();mutate(f);assert.throws(()=>helper.inspectFrozenGeographicSelection(f.input,f.proof),/^Error: GEOGRAPHIC_SELECTION_/);});

test('unsafe proof paths and wrong proof SHA fail without exposing private values',async()=>{
 for(const proofPath of [join(root,'package.json'),join(root,'tmp/../package.json'),'https://example.invalid/proof.json']){
  await assert.rejects(()=>helper.preloadGeographicSelectionProof({projectRoot:root,proofPath,proofSha256:'0'.repeat(64)}),/^Error: GEOGRAPHIC_SELECTION_/);
 }
});

test('unknown actors and stale contexts fail against real hash-checked stored journal',async()=>{
 const f=inputFixture(),folder=mkdtempSync(join(root,'tmp/geographic-selection-admission-test-'));
 try{
  const store=join(folder,'session-store-v2/social-sessions');mkdirSync(store,{recursive:true});
  const world=prepareHybridStep(createSociety(f.input)),context=world.hybrid!.pending!;assert.ok(context);
  const row={format:2,id:'b665c64c-651a-443c-beb5-99014ac0ae70',runId:f.input.runId,revision:0,input:f.input,tick:world.tick,recordCount:0,records:[],pending:context,reservation:context,previous:null};
  writeFileSync(join(store,row.id+'.jsonl'),JSON.stringify({...row,hash:createHash('sha256').update(canonical(row)).digest('hex')})+'\n');
  const contextWire=JSON.parse(encodeMenuContext(context));
  // The helper resolves and checks actual storage before consuming a proof.
  const options={projectRoot:root,storageRoot:folder,contextId:context.id,actor:context.actor.id,expectedRunId:f.input.runId,context:contextWire,proofPath:resolve(folder,'unused-proof.json'),proofSha256:'0'.repeat(64)};
  await assert.rejects(()=>helper.verifyGeographicSelectionAdmission({...options,actor:'unknown-actor'}),/^Error: GEOGRAPHIC_SELECTION_CONTEXT/);
  await assert.rejects(()=>helper.verifyGeographicSelectionAdmission({...options,contextId:context.id+'-stale'}),/^Error: GEOGRAPHIC_SELECTION_CONTEXT/);
 }finally{rmSync(folder,{recursive:true,force:true});}
});

const referenceProof=join(root,'tmp/geographic-selection-v7-integrated-20261102/reference-selection-proof.json');
test('complete independent proof admits actual journal and rejects forged accepted SHA',{skip:!existsSync(referenceProof)},async()=>{
 const f=inputFixture(),folder=mkdtempSync(join(root,'tmp/geographic-selection-admission-io-'));
 const store=join(folder,'session-store-v2/social-sessions');mkdirSync(store,{recursive:true});
 const proofSha256=createHash('sha256').update(readFileSync(referenceProof)).digest('hex');
 const proofOptions={projectRoot:root,proofPath:referenceProof,proofSha256};
 try{
  const preloaded=await helper.preloadGeographicSelectionProof(proofOptions);assert.equal(preloaded.representedAgents,10000);
  function persist(input:any){
   const world=prepareHybridStep(createSociety(input)),context=world.hybrid!.pending!;assert.ok(context);
   const row={format:2,id:'b665c64c-651a-443c-beb5-99014ac0ae70',runId:input.runId,revision:0,input,tick:world.tick,recordCount:0,records:[],pending:context,reservation:context,previous:null};
   writeFileSync(join(store,row.id+'.jsonl'),JSON.stringify({...row,hash:createHash('sha256').update(canonical(row)).digest('hex')})+'\n');
   return {...proofOptions,storageRoot:folder,contextId:context.id,actor:context.actor.id,expectedRunId:input.runId,context:JSON.parse(encodeMenuContext(context))};
  }
  const options=persist(f.input),receipt=await helper.verifyGeographicSelectionAdmission(options);
  assert.equal(receipt.active,50);assert.equal(receipt.improvedCapable,4);assert.equal(receipt.proofSha256,proofSha256);
  assert.doesNotMatch(JSON.stringify(receipt),/citizen-|profiles|homeProxy|PRIVATE_|statement/);
  await assert.rejects(()=>helper.verifyGeographicSelectionAdmission({...options,expectedRunId:'stale-run'}),/^Error: GEOGRAPHIC_SELECTION_CONTEXT/);
  const forgedContext=structuredClone(options);forgedContext.context.grounding.facts[0].value='FORGED_PRIVATE_SOURCE';
  await assert.rejects(()=>helper.verifyGeographicSelectionAdmission(forgedContext),/^Error: GEOGRAPHIC_SELECTION_CONTEXT/);
  await assert.rejects(()=>helper.preloadGeographicSelectionProof({...proofOptions,proofSha256:'0'.repeat(64)}),/^Error: GEOGRAPHIC_SELECTION_PROOF_SHA/);
  f.input.citizenGrounding.hybridBinding.fingerprint='a'.repeat(64);f.input.citizenSelection.bindingFingerprint='a'.repeat(64);
  await assert.rejects(()=>helper.verifyGeographicSelectionAdmission(persist(f.input)),/^Error: GEOGRAPHIC_SELECTION_/);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
