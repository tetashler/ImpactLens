// Opt-in, network-blocked browser acceptance only. Never imported by the application.
import {registerDraft} from '../../lib/dynamic-scenarios/registration.ts';
import {worldFixtures as dynamicFixtures} from '../../lib/world-graph/fixtures.ts';
import {writeFileSync,mkdirSync} from 'node:fs';
const nativeFetch=globalThis.fetch,fixtures=dynamicFixtures(),calls=[];
const invalidPlanQuestion='What if the planner returns an invalid entity type?';
const invalidSourceQuestion='What if the planner invents a source reference?',invalidQuoteQuestion='What if the planner invents a quotation?';
const fixtureQuestion=q=>process.env.IMPACTLENS_PHASE2B_MOCK==='true'&&(q===invalidPlanQuestion||process.env.IMPACTLENS_FLEXIBLE_GROUNDING_MOCK==='true'&&[invalidSourceQuestion,invalidQuoteQuestion].includes(q))?fixtures[0].request.question:q;
// Explicit Phase 2B fixtures, never production entity extraction.
if(process.env.IMPACTLENS_PHASE2B_MOCK==='true')for(const [index,f]of fixtures.entries()){
 const names=index===0?['Ministry of Manpower','National Trades Union Congress','Singapore National Employers Federation']:index===1?['PUB Singapore','Malaysian water authorities','Water-dependent businesses']:null;
 if(names){f.draft.ontology.entities=f.draft.ontology.entities.slice(0,3).map((e,i)=>({...e,name:names[i]}));f.draft.ontology.entityTypes.forEach((t,i)=>{t.name=(index===0?['Government agency','Labour organisation','Employer association']:['Public water agency','Government agency','Business group'])[i];});const ids=new Set([...f.draft.ontology.entities.map(e=>e.id),...f.draft.agents.map(a=>a.id)]);f.draft.ontology.relationships=f.draft.ontology.relationships.filter(r=>ids.has(r.source)&&ids.has(r.target));}
}
mkdirSync(new URL('../../tmp/dynamic-scenarios/',import.meta.url),{recursive:true});
globalThis.fetch=async(url,init)=>{
 const address=typeof url==='string'?url:url instanceof URL?url.href:url.url;
 init??={};if(typeof url!=='string'&&typeof url.clone==='function'&&!init.body)init={...init,body:await url.clone().text()};
 if(address==='https://api.tavily.com/search'){
  const b=JSON.parse(String(init.body)),f=fixtures.find(f=>f.request.question===fixtureQuestion(b.query));if(!f)throw Error('No mocked research question');
  calls.push({fixture:fixtures.indexOf(f),purpose:'retrieval',turn:null});
  return Response.json({results:[{title:'Mock source excerpt for browser acceptance',url:'https://www.mom.gov.sg/',content:`Mocked retrieval fixture only. ${f.draft.ontology.entities[0].name} is mentioned here to test exact source linkage. This is not a live source verification.`}],usage:{credits:1}});
 }
 if(address==='https://openrouter.ai/api/v1/chat/completions'){
  const b=JSON.parse(String(init.body));
  if(b.model!=='deepseek/deepseek-v4-flash-0731'||JSON.stringify(b.provider)!==JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})||b.reasoning?.effort!=='none')throw Error('Mock routing mismatch');
  const c=JSON.parse(b.messages[1].content),planning=b.response_format.json_schema.name.startsWith('dynamic_'),stage=b.response_format.json_schema.name;
  if(planning&&c.question==='What if planning takes too long?')return new Promise((_,reject)=>{init.signal?.addEventListener('abort',()=>reject(new DOMException('Mock planning timeout','AbortError')),{once:true});});
  const f=fixtures.find(f=>f.request.question===fixtureQuestion(planning?c.question:c.input.question));if(!f)throw Error('No development fixture for this question');
  const other=[...(c.previousEvents??[])].reverse().find(e=>e.roleId!==c.role?.id);
  const proposed=structuredClone(f.draft),source=(c.retrievalCandidates?.sources??c.retrievalCandidates)?.[0];if(planning&&source){const p=source.passages[0],support={sourceId:source.id,passageId:p.id,quote:p.text};proposed.ontology.entities[0].support=support;proposed.ontology.relationships[0].support=support;}
  if(planning&&process.env.IMPACTLENS_PHASE2B_MOCK==='true'&&c.question===invalidPlanQuestion)proposed.ontology.entities[0].typeId='unknown-type';
  if(planning&&process.env.IMPACTLENS_FLEXIBLE_GROUNDING_MOCK==='true'&&source){
   proposed.ontology.entities[0].name='Ministry of Manpower (MOM)';
   if(c.question===invalidSourceQuestion)proposed.ontology.entities[0].support.sourceId='unknown-source';
   if(c.question===invalidQuoteQuestion)proposed.ontology.entities[0].support.quote='A fabricated quotation absent from the retrieval fixture.';
  }
  const stageOne=structuredClone(proposed);stageOne.ontology.relationships=[];stageOne.entities=[];stageOne.agents.forEach(a=>a.entityIds=[]);const registered=registerDraft(stageOne);const map=id=>registered.registration.registries.worldEntities.find(m=>m.original===id)?.canonical??id;
  const value=planning?(stage==='dynamic_entities_v2'?stageOne:stage==='dynamic_relationships_v2'?{relationships:proposed.ontology.relationships.map(r=>({...r,source:map(r.source),target:map(r.target),typeId:registered.registration.registries.relationshipTypes.find(t=>t.original===r.typeId).canonical}))}:proposed):{type:other?'response':'argument',addressedRoleId:other?.roleId??null,statement:`Mock provider fixture: ${c.role.title} considers the proposed change${other?` in response to the recorded ${other.roleId} turn`:''}. Real-world consequences and implementation conditions remain unknown.`,previousEventIds:other?[other.id]:[],evidenceFindingIds:[],assumptionIds:[],reasoningSummary:'Mocked structured action uses accepted earlier context; this is test evidence, not a live provider result.',uncertainties:['No measured economic, health or public-opinion result is established.'],position:c.memory.position??'information-seeking',topics:['implementation-conditions']};
  if(planning&&['dynamic_entities_v2','dynamic_relationships_v2'].includes(stage))for(const e of (stage==='dynamic_entities_v2'?value.ontology.entities:value.relationships))if(e.support){const {sourceId,passageId}=e.support;e.support={sourceId,passageId};}
  if(planning&&stage==='dynamic_entities_v2'&&process.env.IMPACTLENS_FLEXIBLE_GROUNDING_MOCK==='true'&&c.question===invalidQuoteQuestion)value.ontology.entities[0].support.quote='Forbidden model-authored quote property.';
  calls.push({fixture:fixtures.indexOf(f),purpose:planning?stage:'action',turn:planning?null:c.turnIndex});writeFileSync(new URL('../../tmp/dynamic-scenarios/mock-ledger.json',import.meta.url),JSON.stringify(calls));
  return Response.json({id:`mock-browser-${calls.length}`,model:b.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',native_finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:planning?500:100,completion_tokens:planning?1000:50,total_tokens:planning?1500:150,cost:planning?0.001:0.0001,completion_tokens_details:{reasoning_tokens:0}}});
 }
 if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(address))throw Error('External server inference/network disabled in mock acceptance');
 return nativeFetch(url,init);
};
