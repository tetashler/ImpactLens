import assert from 'node:assert/strict';
import {worldFixtures as dynamicFixtures} from '../../../world-graph/fixtures.ts';
import {MODEL} from '../../../server/inference/deepseek.ts';
function mocked(f:ReturnType<typeof dynamicFixtures>[number],mutate?:(body:any,reply:any)=>void){let calls=0,plans=0;const fetcher:typeof fetch=async(url,init)=>{
 assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');const b=JSON.parse(String(init?.body));calls++;
 assert.equal(b.model,MODEL);assert.deepEqual(b.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});assert.deepEqual(b.reasoning,{effort:'none',exclude:true});
 const planning=b.response_format.json_schema.name==='dynamic_scenario_v2';if(planning)plans++;
 const c=JSON.parse(b.messages[1].content),other=[...(c.previousEvents??[])].reverse().find((e:any)=>e.roleId!==c.role?.id);
 const action=planning?f.draft:{type:other?'response':'argument',addressedRoleId:other?.roleId??null,statement:`A separately mocked action for ${c.role.title}; conditions remain unresolved.`,previousEventIds:other?[other.id]:[],evidenceFindingIds:[],assumptionIds:[],reasoningSummary:'This mock reacts to supplied recorded context, without forecasting.',uncertainties:['Real-world outcomes are unknown.'],position:c.memory.position??'information-seeking',topics:['policy-conditions']};
 const reply={id:`mock-${calls}`,model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(action)}}],usage:{prompt_tokens:planning?500:100,completion_tokens:planning?1000:50,total_tokens:planning?1500:150,cost:planning?0.001:0.0001}};mutate?.(b,reply);return Response.json(reply);
 };return {fetcher,counts:()=>({calls,plans})};}
export const mockDynamicProvider=mocked;
