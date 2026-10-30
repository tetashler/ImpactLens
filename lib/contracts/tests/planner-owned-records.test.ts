import test from 'node:test';import assert from 'node:assert/strict';
import {assignPlannerRecordIds} from '../../server/inference/planner-records.ts';
import {entityStageSchema,relationshipStageSchema,parseGeneratedDraft} from '../../server/inference/planner.ts';
import {plannerFixture} from './helpers/planner-fixture.ts';
test('new generation omits unreferenced bookkeeping IDs; assembly assigns them before strict validation',()=>{
 const f=plannerFixture(),wire:any=structuredClone(f.draft);delete wire.unsupportedQuantities;wire.relationships=wire.relationships.map(({id,...r}:any)=>r);wire.assumptions=wire.assumptions.map(({id,...a}:any)=>a);
 const accepted=assignPlannerRecordIds(wire,'entities') as any;assert.deepEqual(accepted.relationships.map((r:any)=>r.id),wire.relationships.map((_:any,i:number)=>'opportunity-'+(i+1)));assert.equal(JSON.stringify(wire).includes('opportunity-1'),false);assert.deepEqual(assignPlannerRecordIds(wire,'entities'),accepted);parseGeneratedDraft(accepted,f.request,f.grounding);
 const s:any=entityStageSchema();assert.equal(s.properties.relationships.items.properties.id,undefined);assert.equal(s.properties.assumptions.items.properties.id,undefined);
 const r:any=relationshipStageSchema(f.draft);assert.equal(r.properties.relationships.items.properties.id,undefined);assert.deepEqual(assignPlannerRecordIds({relationships:[{source:'entity',target:'agent-1',typeId:'type',statement:'Fixture',support:null}]},'relationships'),{relationships:[{id:'world-relationship-1',source:'entity',target:'agent-1',typeId:'type',statement:'Fixture',support:null}]});
});
test('model-supplied record IDs, invalid endpoints and disconnected networks remain rejected',()=>{
 const f=plannerFixture();assert.throws(()=>assignPlannerRecordIds(f.draft,'entities'));const raw:any=structuredClone(f.draft);delete raw.unsupportedQuantities;raw.relationships=raw.relationships.map(({id,...r}:any)=>r);raw.assumptions=raw.assumptions.map(({id,...a}:any)=>a);raw.relationships[0].sourceAgentId='unknown';assert.throws(()=>parseGeneratedDraft(assignPlannerRecordIds(raw,'entities'),f.request,f.grounding),(e:any)=>e.diagnostic?.rule==='agent.cross_reference_invalid');
 f.draft.relationships[1].id=f.draft.relationships[0].id;assert.throws(()=>parseGeneratedDraft(f.draft,f.request,f.grounding),(e:any)=>e.diagnostic?.rule==='plan.duplicate_value');
});
