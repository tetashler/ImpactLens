/** Explicit Phase4E fixture adapter. Native external fetch is blocked before any app code loads. */
import './offline-network.mjs';
import {buildRetrievalQuery} from '../../lib/server/evidence/retrieval-query.ts';
import {buildScenarioDemographicContext} from '../../lib/server/demographics/scenario-context.ts';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {worldFixtures} from '../../lib/world-graph/fixtures.ts';
import {registerDraft} from '../../lib/dynamic-scenarios/registration.ts';
import {entityDeclarationFixture,entityReferenceFixture,entityDeclarationOrder} from './entity-declaration-fixture.ts';
import {stakeholderProviderFixture} from './stakeholder-decision-fixture.ts';
import {phase4eProviderFixture,FIXTURE_USAGE} from './phase4e-fixture.ts';

const nativeFetch=globalThis.fetch;
const dummyKeys=process.env.OPENROUTER_API_KEY==='sk-or-v1-'+'0'.repeat(64)&&process.env.TAVILY_API_KEY==='tvly-'+'0'.repeat(32);
const expectedCalls=process.env.SOCIAL_SWARM_SIZE==='50'?'350':process.env.SOCIAL_SWARM_SIZE==='100'?'700':null;
if(process.env.IMPACTLENS_PHASE4E2_MOCK!=='true'||!dummyKeys||!expectedCalls||process.env.SOCIAL_MAX_DECISIONS!==expectedCalls||process.env.SOCIAL_PROVIDER_MAX_CALLS!==expectedCalls||!nativeFetch.toString().includes('OFFLINE_EXTERNAL_FETCH_BLOCKED')||process.env.IMPACTLENS_PHASE4D_LIVE_GUARD==='true')throw Error('PHASE4E2_OFFLINE_PREFLIGHT_REQUIRED');
const output=resolve('tmp/phase4e2/desktop'),ledgerPath=join(output,'mock-ledger.json');mkdirSync(output,{recursive:true});
const fixtures=worldFixtures(),calls=[];
for(const [index,f]of fixtures.entries()){
 const names=index===0?['Ministry of Manpower','National Trades Union Congress','Singapore National Employers Federation']:index===1?['PUB Singapore','Malaysian water authorities','Water-dependent businesses']:null;
 if(names){f.draft.ontology.entities=f.draft.ontology.entities.slice(0,3).map((e,i)=>({...e,name:names[i]}));f.draft.ontology.entityTypes.forEach((t,i)=>{t.name=(index===0?['Government agency','Labour organisation','Employer association']:['Public water agency','Government agency','Business group'])[i];});const ids=new Set([...f.draft.ontology.entities.map(e=>e.id),...f.draft.agents.map(a=>a.id)]);f.draft.ontology.relationships=f.draft.ontology.relationships.filter(r=>ids.has(r.source)&&ids.has(r.target));}
 f.draft.agents.forEach((a,i)=>{a.goals=[['Protect monthly income','Avoid unpaid compressed shifts'],['Maintain service coverage','Plan staffing costs'],['Keep services accessible','Discuss practical conditions'],['Design a feasible transition','Protect public-service continuity']][i%4];});
 f.draft.ontology.entityTypes.push({id:'communication',name:'Communication platform',description:'Fictional public and private communication environments.'});
 for(const name of ['Reddit','Instagram','WhatsApp','Telegram'])f.draft.ontology.entities.push({id:name.toLowerCase(),name,typeId:'communication',jurisdictionId:null,support:null});
}
function record(row){calls.push(row);writeFileSync(ledgerPath,JSON.stringify({version:1,mode:'network-blocked-fixtures',paidProviderCalls:0,actualChargesUsd:0,calls},null,2));}
globalThis.fetch=async(input,init={})=>{
 const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(typeof input!=='string'&&typeof input.clone==='function'&&!init.body)init={...init,body:await input.clone().text()};
 if(address==='https://api.tavily.com/search'){
  const b=JSON.parse(String(init.body)),f=fixtures.find(f=>buildRetrievalQuery(f.request.question,buildScenarioDemographicContext(f.request.question).planningArea?.name)===b.query);if(!f)throw Error('PHASE4E2_UNKNOWN_FIXTURE_QUESTION');
  record({purpose:'retrieval',fixture:fixtures.indexOf(f)});
  return Response.json({results:[{title:'Mock source excerpt for offline desktop acceptance',url:'https://www.mom.gov.sg/',content:`Mocked retrieval fixture only. ${f.draft.ontology.entities[0].name} is mentioned here to test exact source linkage. This is not live source verification.`}],usage:{credits:1}});
 }
 if(address==='https://openrouter.ai/api/v1/chat/completions'){
  const b=JSON.parse(String(init.body)),stage=b.response_format?.json_schema?.name;
  if(b.model!=='deepseek/deepseek-v4-flash-0731'||JSON.stringify(b.provider)!==JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})||b.reasoning?.effort!=='none'||b.reasoning?.exclude!==true||b.stream!==false||!['social_decision_v1','dynamic_entities_v2','dynamic_entities_v3','dynamic_relationships_v2','stakeholder_turn_v1'].includes(stage))throw Error('PHASE4E2_FIXTURE_ROUTING');
  const c=JSON.parse(b.messages[1].content),entityStage=['dynamic_entities_v2','dynamic_entities_v3'].includes(stage);
  let value,usage;
  if(stage==='social_decision_v1'){
   if(b.max_tokens!==600||!['conversation-menu-v2','conversation-menu-v3'].includes(c.policy))throw Error('PHASE4E2_SOCIAL_WIRE');
   value=phase4eProviderFixture(c);if(value.text){const words=['roster','income','coverage','access','cost','conditions','training','care','staffing','protection','timing'];const n=calls.filter(r=>r.purpose==='social').length;value.text='RAW_PHASE4E2_SOCIAL '+c.actor.label.slice(0,80)+' asks whether '+words[n%words.length]+' and '+words[Math.floor(n/words.length)%words.length]+' need a distinct safeguard before implementation? Recorded step '+c.tick+' ordinal '+n+'.';value.discussion.argument='question';}usage=FIXTURE_USAGE;record({purpose:'social',tick:c.tick,actorId:c.actor.id,platform:c.platform,offered:c.choices.length,selectedAction:c.choices.find(o=>o.id===value.choiceId)?.action});
  }else{
   const planning=stage.startsWith('dynamic_'),f=fixtures.find(f=>f.request.question===(planning?c.question:c.input.question));if(!f)throw Error('PHASE4E2_UNKNOWN_FIXTURE_QUESTION');
   const proposed=structuredClone(f.draft),source=(c.retrievalCandidates?.sources??c.retrievalCandidates)?.[0];
   if(planning&&source){const passage=source.passages[0],support={sourceId:source.id,passageId:passage.id,quote:passage.text};proposed.ontology.entities[0].support=support;proposed.ontology.relationships[0].support=support;}
   const stageOne=structuredClone(proposed);stageOne.ontology.relationships=[];stageOne.entities=[];stageOne.agents.forEach(a=>a.entityIds=[]);
   if(stageOne.scope==='local'&&stageOne.jurisdictions.length===1){const old=stageOne.jurisdictions[0].id;stageOne.jurisdictions[0].id='jurisdiction-1';stageOne.agents.forEach(a=>{if(a.jurisdictionId===old)a.jurisdictionId='jurisdiction-1';});stageOne.ontology.entities.forEach(e=>{if(e.jurisdictionId===old)e.jurisdictionId='jurisdiction-1';});}
   for(const entity of stageOne.ontology.entities){const styles={reddit:'public-discussion',instagram:'public-feed',whatsapp:'private-group',telegram:'private-group'};entity.communication=styles[entity.name.toLowerCase()]?{version:1,style:styles[entity.name.toLowerCase()]}:null;}
   const registered=registerDraft(entityDeclarationOrder(stageOne)),mapped=id=>registered.registration.registries.worldEntities.find(e=>e.original===id)?.canonical??id;
   if(planning){
    value=entityStage?stageOne:{relationships:proposed.ontology.relationships.map(r=>({...r,source:mapped(r.source),target:mapped(r.target),typeId:registered.registration.registries.relationshipTypes.find(t=>t.original===r.typeId).canonical}))};
    for(const entity of(entityStage?value.ontology.entities:value.relationships))if(entity.support){const {sourceId,passageId}=entity.support;entity.support={sourceId,passageId};}
    if(entityStage)value=stage==='dynamic_entities_v3'?entityReferenceFixture(value):entityDeclarationFixture(value);else value.relationships=value.relationships.map(({id,...rest})=>rest);
   }else{
    const other=[...(c.previousEvents??[])].reverse().find(e=>e.roleId!==c.role?.id);
    value=stakeholderProviderFixture(c,{type:other?'response':'argument',addressedRoleId:other?.roleId??null,statement:`RAW_PHASE4E2_STAKEHOLDER ${c.role.title} discusses monthly wages, fair rosters and service coverage.`,previousEventIds:other?[other.id]:[],evidenceFindingIds:[],assumptionIds:[],reasoningSummary:'Explicit offline fixture uses accepted earlier context.',uncertainties:['No measured economic or public-opinion outcome is established.'],position:c.memory.position??'information-seeking',topics:['implementation-conditions']});
   }
   record({purpose:planning?stage:'action',fixture:fixtures.indexOf(f),turn:planning?null:c.turnIndex});
   usage={prompt_tokens:planning?500:100,completion_tokens:planning?1000:50,total_tokens:planning?1500:150,cost:planning?0.001:0.0001,completion_tokens_details:{reasoning_tokens:0}};
  }
  return Response.json({id:'mock-phase4e-desktop-'+calls.length,model:b.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',native_finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage});
 }
 if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(address))throw Error('PHASE4E2_EXTERNAL_NETWORK_DISABLED');
 return nativeFetch(input,init);
};
globalThis.__phase4e2MockGuard={version:1,dummyKeys,nativeExternalBlocked:true,fixtureAdapters:true,paidDispatch:false,activeAgents:Number(process.env.SOCIAL_SWARM_SIZE),socialMax:Number(expectedCalls)};
console.info('PHASE4E2_OFFLINE_GUARD_READY',JSON.stringify(globalThis.__phase4e2MockGuard));
