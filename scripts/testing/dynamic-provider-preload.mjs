// Opt-in, network-blocked browser acceptance only. Never imported by the application.
import {worldFixtures as dynamicFixtures} from '../../lib/world-graph/fixtures.ts';
import {writeFileSync,mkdirSync} from 'node:fs';
const nativeFetch=globalThis.fetch,fixtures=dynamicFixtures(),calls=[];
mkdirSync(new URL('../../tmp/dynamic-scenarios/',import.meta.url),{recursive:true});
globalThis.fetch=async(url,init)=>{
 const address=typeof url==='string'?url:url instanceof URL?url.href:url.url;
 init??={};if(typeof url!=='string'&&typeof url.clone==='function'&&!init.body)init={...init,body:await url.clone().text()};
 if(address==='https://api.tavily.com/search'){
  const b=JSON.parse(String(init.body)),f=fixtures.find(f=>f.request.question===b.query);if(!f)throw Error('No mocked research question');
  calls.push({fixture:fixtures.indexOf(f),purpose:'retrieval',turn:null});
  return Response.json({results:[{title:'Mock source excerpt for browser acceptance',url:'https://www.mom.gov.sg/',content:`Mocked retrieval fixture only. ${f.draft.ontology.entities[0].name} is mentioned here to test exact source linkage. This is not a live source verification.`}],usage:{credits:1}});
 }
 if(address==='https://openrouter.ai/api/v1/chat/completions'){
  const b=JSON.parse(String(init.body));
  if(b.model!=='deepseek/deepseek-v4-flash-0731'||JSON.stringify(b.provider)!==JSON.stringify({only:['digitalocean'],allow_fallbacks:false,require_parameters:true})||b.reasoning?.effort!=='none')throw Error('Mock routing mismatch');
  const c=JSON.parse(b.messages[1].content),planning=b.response_format.json_schema.name==='dynamic_scenario_v1'||b.response_format.json_schema.name==='dynamic_scenario_v2';
  const f=fixtures.find(f=>f.request.question===(planning?c.question:c.input.question));if(!f)throw Error('No development fixture for this question');
  const other=[...(c.previousEvents??[])].reverse().find(e=>e.roleId!==c.role?.id);
  const proposed=structuredClone(f.draft),source=c.retrievalCandidates?.sources?.[0];if(planning&&source){const p=source.passages[0],support={sourceId:source.id,passageId:p.id,quote:p.text};proposed.ontology.entities[0].support=support;proposed.ontology.relationships[0].support=support;}
  const value=planning?proposed:{type:other?'response':'argument',addressedRoleId:other?.roleId??null,statement:`Mock provider fixture: ${c.role.title} considers the proposed change${other?` in response to the recorded ${other.roleId} turn`:''}. Real-world consequences and implementation conditions remain unknown.`,previousEventIds:other?[other.id]:[],evidenceFindingIds:[],assumptionIds:[],reasoningSummary:'Mocked structured action uses accepted earlier context; this is test evidence, not a live provider result.',uncertainties:['No measured economic, health or public-opinion result is established.'],position:c.memory.position??'information-seeking',topics:['implementation-conditions']};
  calls.push({fixture:fixtures.indexOf(f),purpose:planning?'planning':'action',turn:planning?null:c.turnIndex});writeFileSync(new URL('../../tmp/dynamic-scenarios/mock-ledger.json',import.meta.url),JSON.stringify(calls));
  return Response.json({id:`mock-browser-${calls.length}`,model:b.model,provider:'DigitalOcean',choices:[{finish_reason:'stop',native_finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:planning?500:100,completion_tokens:planning?1000:50,total_tokens:planning?1500:150,cost:planning?0.001:0.0001,completion_tokens_details:{reasoning_tokens:0}}});
 }
 if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(address))throw Error('External server inference/network disabled in mock acceptance');
 return nativeFetch(url,init);
};
