import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRetrievalQuery} from '../../server/evidence/retrieval-query.ts';
import {retrieveTavilyGrounding} from '../../server/evidence/tavily.ts';
import {parseGroundingBundle,parseGroundingSupport,type GroundingBundle,type GroundingSource} from '../../grounding/contract.ts';
import {resolvePassageSelection} from '../../dynamic-scenarios/passage-selection.ts';
import {assessEntityAttribution,effectiveReportOntology} from '../../world-graph/attribution.ts';
import {parseWorldOntology,type WorldOntologyV1} from '../../world-graph/ontology.ts';

const question='What if a new government-supported eldercare centre in Sengkang begins a three-day pilot of neighbourhood volunteer visits and caregiver-support sessions?';
const retrievedAt='2026-10-31T00:00:00.000Z';
type Candidate={title:string;url:string;content:string;published_date?:string};
const official:Candidate={title:'Offline fixture: Singapore caregiving background',url:'https://www.moh.gov.sg/offline-fixture/background',content:'Offline fixture only: background on Singapore caregiver support services.',published_date:'2024-01-15'};
const overseas:Candidate={title:'Offline fixture: international volunteer caregiving',url:'https://caregiving-programme.org/offline-fixture/background',content:'Offline fixture only: an overseas volunteer programme describes caregiver visits.',published_date:'2023-02-20'};

async function retrieve(results:Candidate[]){
 const requests:{url:string;body:Record<string,unknown>}[]=[];
 const bundle=await retrieveTavilyGrounding(buildRetrievalQuery(question,'Sengkang'),undefined,{key:'offline-fixture-only',now:()=>new Date(retrievedAt),fetcher:async(url,init)=>{
  requests.push({url:String(url),body:JSON.parse(String(init?.body))});
  assert.equal(String(url),'https://api.tavily.com/search','A citation URL must never be fetched');
  return Response.json({results,usage:{credits:1}});
 }});
 assert.equal(requests.length,1);assert.equal(requests[0].body.query,'Sengkang Singapore: '+question);
 assert.equal(requests[0].body.search_depth,'basic');assert.equal(requests[0].body.max_results,5);
 return {bundle,requests};
}

function proposedPilot(source:GroundingSource,bundle:GroundingBundle):WorldOntologyV1['entities'][number]{
 const support=resolvePassageSelection({sourceId:source.id,passageId:source.passages[0].id},bundle,'draft.ontology.entities[0].support');
 return {id:'proposed-pilot',typeId:'proposed-facility',name:'Proposed Sengkang pilot',jurisdictionId:null,support};
}

test('Singapore official-domain and general international fixtures remain unverified candidates for the hypothetical pilot',async()=>{
 const {bundle}=await retrieve([overseas,official]);
 assert.deepEqual(bundle.sources.map(s=>s.publisher),['www.moh.gov.sg','caregiving-programme.org']);
 assert.deepEqual(parseGroundingBundle(JSON.parse(JSON.stringify(bundle))),bundle);
 assert.ok(bundle.limitations.some(s=>/unverified source excerpts/i.test(s)&&/do not establish truth, applicability, or semantic entailment/i.test(s)));
 assert.ok(bundle.limitations.some(s=>/presentation heuristic/i.test(s)&&/not verification.*relevance/i.test(s)));
 for(const source of bundle.sources){
  const entity=proposedPilot(source,bundle),assessed=assessEntityAttribution(entity,bundle);
  assert.deepEqual(assessed.attribution,{version:1,status:'unverified-candidate',reason:'entity-mention-not-established'});assert.equal(assessed.evidence,null);
  const ontology:WorldOntologyV1={version:1,entityTypes:[{id:'proposed-facility',name:'Proposed facility',description:'Hypothetical scenario context'}],relationshipTypes:[{id:'coordinates',name:'Coordinates',description:'Proposed coordination'}],entities:[entity],relationships:[]};
  parseWorldOntology(ontology,{jurisdictions:[],agents:[]},bundle);
  assert.equal(effectiveReportOntology(ontology,bundle).entities[0].support,null);
 }
});

test('no search results leave an explicit lack of usable excerpts and cannot supply a local pilot citation',async()=>{
 const {bundle,requests}=await retrieve([]);
 assert.equal(bundle.status,'retrieved');assert.deepEqual(bundle.sources,[]);
 assert.ok(bundle.limitations.includes('No usable source excerpts were returned.'));
 assert.throws(()=>resolvePassageSelection({sourceId:'sengkang-pilot',passageId:'invented'},bundle,'draft.ontology.entities[0].support'),(error:any)=>error.diagnostic?.rule==='ontology.source_reference_unknown');
 assert.equal(requests.length,1);
});

test('overseas-only results stay overseas despite the Singapore query prefix',async()=>{
 const {bundle,requests}=await retrieve([overseas]);
 assert.deepEqual(bundle.sources.map(s=>({title:s.title,url:s.url,text:s.passages[0].text})),[{title:overseas.title,url:overseas.url,text:overseas.content}]);
 assert.equal(assessEntityAttribution(proposedPilot(bundle.sources[0],bundle),bundle).attribution.status,'unverified-candidate');
 assert.ok(bundle.limitations.some(s=>/do not establish truth, applicability, or semantic entailment/i.test(s)));
 assert.equal(requests.length,1);
});

test('conflicting dated excerpts survive as separate exact source reports without resolving which schedule is true',async()=>{
 const earlier={...official,title:'Offline fixture: earlier morning schedule',url:'https://www.moh.gov.sg/offline-fixture/earlier',content:'Offline fixture only: caregiver sessions start in the morning.',published_date:'2022-01-01'};
 const later={...official,title:'Offline fixture: later evening schedule',url:'https://www.moh.gov.sg/offline-fixture/later',content:'Offline fixture only: caregiver sessions start in the evening.',published_date:'2026-10-01'};
 const {bundle}=await retrieve([earlier,later]);
 assert.deepEqual(bundle.sources.map(s=>({title:s.title,publishedAt:s.publishedAt,retrievedAt:s.retrievedAt,text:s.passages[0].text})),[
  {title:earlier.title,publishedAt:'2022-01-01T00:00:00.000Z',retrievedAt,text:earlier.content},
  {title:later.title,publishedAt:'2026-10-01T00:00:00.000Z',retrievedAt,text:later.content},
 ]);
 for(const source of bundle.sources)assert.equal(resolvePassageSelection({sourceId:source.id,passageId:source.passages[0].id},bundle,'draft.ontology.entities[0].support')?.quote,source.passages[0].text);
 assert.ok(bundle.limitations.some(s=>/unverified source excerpts/i.test(s)));
});

test('missing and invalid publication dates remain unknown rather than inheriting retrieval time',async()=>{
 const missing={...overseas,url:'https://caregiving-programme.org/offline-fixture/undated'};
 delete missing.published_date;
 const invalid={...overseas,url:'https://caregiving-programme.org/offline-fixture/invalid-date',published_date:'not-a-date'};
 const {bundle}=await retrieve([missing,invalid]);
 assert.deepEqual(bundle.sources.map(s=>s.publishedAt),[null,null]);
 assert.deepEqual(bundle.sources.map(s=>s.retrievedAt),[retrievedAt,retrievedAt]);
});

test('canonical duplicates collapse and invalid citation pairs fail without fetching or retrying any source URL',async()=>{
 const {bundle,requests}=await retrieve([
  {...official,url:official.url+'?utm_source=fixture#first'},
  {...official,url:official.url+'#duplicate'},overseas,
  {...official,url:'https://user:password@www.moh.gov.sg/offline-fixture/unsafe'},
 ]);
 assert.deepEqual(bundle.sources.map(s=>s.url),[official.url,overseas.url]);
 const [local,foreign]=bundle.sources,selected={sourceId:local.id,passageId:local.passages[0].id};
 assert.equal(resolvePassageSelection(selected,bundle,'draft.ontology.entities[0].support')?.quote,official.content);
 for(const [selection,rule]of [
  [{sourceId:'invented',passageId:local.passages[0].id},'ontology.source_reference_unknown'],
  [{sourceId:local.id,passageId:foreign.passages[0].id},'ontology.source_passage_unknown'],
 ] as const)assert.throws(()=>resolvePassageSelection(selection,bundle,'draft.ontology.entities[0].support'),(error:any)=>error.diagnostic?.rule===rule);
 assert.throws(()=>parseGroundingSupport({...selected,quote:'The new Sengkang pilot has already begun.'},bundle),(error:any)=>error.diagnostic?.rule==='ontology.source_quote_not_found');
 assert.equal(requests.length,1);
});

test('a hypothetical query stays hypothetical and even a literal source mention is provenance rather than verification',async()=>{
 const reported={...official,content:'Offline fixture only: Proposed Sengkang pilot is a hypothetical facility.'};
 const {bundle}=await retrieve([reported]);
 assert.equal(bundle.query,'Sengkang Singapore: What if a new government-supported eldercare centre in Sengkang begins a three-day pilot of neighbourhood volunteer visits and caregiver-support sessions?');
 assert.equal(bundle.sources[0].passages[0].text,reported.content);
 const entity=proposedPilot(bundle.sources[0],bundle),assessed=assessEntityAttribution(entity,bundle);
 assert.equal(assessed.attribution.status,'source-reported');assert.equal(assessed.evidence?.quote,reported.content);
 assert.ok(bundle.limitations.some(s=>/exact quotation do not establish truth, applicability, or semantic entailment/i.test(s)));
 assert.throws(()=>parseGroundingSupport({...entity.support,verified:true},bundle));
});
