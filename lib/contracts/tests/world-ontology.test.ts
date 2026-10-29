import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWorldOntology} from '../../world-graph/ontology.ts';
import {dynamicFixtures} from '../../dynamic-scenarios/fixtures.ts';
import {createDynamicPlan,validateDynamicPlan} from '../../dynamic-scenarios/plan.ts';
export const ontology=()=>({version:1,entityTypes:[{id:'employer',name:'Employer',description:'An employing organisation'},{id:'workforce',name:'Workforce',description:'People considering changed working conditions'}],relationshipTypes:[{id:'negotiates',name:'NEGOTIATES_WITH',description:'Proposed negotiation'}],entities:[{id:'workplace',name:'Illustrative workplace',typeId:'employer',jurisdictionId:'sg',support:null},{id:'workers',name:'Affected workforce',typeId:'workforce',jurisdictionId:'sg',support:null}],relationships:[{id:'negotiation',source:'workplace',target:'workers',typeId:'negotiates',statement:'Working arrangements would need discussion.',support:null}]});
test('scenario ontology is versioned, dynamic and independent from source verification',()=>{
 const f=dynamicFixtures()[0],o=parseWorldOntology(ontology(),f.draft);assert.equal(o.entityTypes[0].name,'Employer');
 for(const mutate of [(v:any)=>v.entities[0].verified=true,(v:any)=>v.relationships[0].target='missing',(v:any)=>v.entityTypes.push(v.entityTypes[0]),(v:any)=>v.entities[0].typeId='unknown',(v:any)=>v.relationships[0].statement='GDP rises 20%']){const bad=ontology();mutate(bad);assert.throws(()=>parseWorldOntology(bad,f.draft));}
});
test('new ontology plans preserve old record identities and bind new world context immutably',async()=>{
 const f=dynamicFixtures()[0],legacy=await createDynamicPlan(f.request,f.draft);
 assert.equal(legacy.version,1);assert.equal((await validateDynamicPlan(legacy)).planId,legacy.planId);
 const draft={...f.draft,ontology:ontology()},p=await createDynamicPlan(f.request,draft);assert.equal(p.version,2);assert.notEqual(p.planId,legacy.planId);
 assert.equal((await validateDynamicPlan(p)).planId,p.planId);
 const changed=structuredClone(p);changed.draft.ontology!.entities[0].name='Changed';await assert.rejects(validateDynamicPlan(changed));
});
