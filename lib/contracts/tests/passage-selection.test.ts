import test from 'node:test';
import assert from 'node:assert/strict';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {passageSelectionSchema,resolvePassageSelection,expandEntitySelections,expandRelationshipSelections} from '../../dynamic-scenarios/passage-selection.ts';
import {parseGeneratedDraft} from '../../server/inference/planner.ts';
import {registerDraft} from '../../dynamic-scenarios/registration.ts';
import {createDynamicPlan,validateDynamicPlan} from '../../dynamic-scenarios/plan.ts';
test('generation selects exact registered source/passage pairs, without model-authored quote bytes',async()=>{
 const f=plannerFixture(),s=f.grounding.sources[0],p=s.passages[0],support={sourceId:s.id,passageId:p.id};const schema=passageSelectionSchema(f.grounding),choice=schema.anyOf[1];assert.ok('properties' in choice);assert.deepEqual(choice.properties.sourceId.enum,[s.id]);assert.deepEqual(choice.required,['sourceId','passageId']);
 assert.deepEqual(resolvePassageSelection(support,f.grounding,'draft.ontology.entities[0].support'),{...support,quote:p.text});
 const raw:any=structuredClone(f.draft);raw.ontology.relationships=[];raw.ontology.entities[0].support=support;const draft=parseGeneratedDraft(expandEntitySelections(raw,f.grounding),f.request,f.grounding),registered=registerDraft(draft,'retrieved-passage-selection-v1'),plan=await createDynamicPlan(f.request,registered.draft,f.grounding,undefined,registered.registration);assert.equal(plan.registration!.supportPolicy,'retrieved-passage-selection-v1');assert.deepEqual(await validateDynamicPlan(plan),plan);
 const altered=structuredClone(plan);delete altered.registration!.supportPolicy;await assert.rejects(()=>validateDynamicPlan(altered));
});
for(const [field,rule]of [['sourceId','ontology.source_reference_unknown'],['passageId','ontology.source_passage_unknown']] as const)test(`selected ${field} remains strict`,()=>{const f=plannerFixture(),e=f.draft.ontology.entities[0].support!;assert.throws(()=>resolvePassageSelection({sourceId:e.sourceId,passageId:e.passageId,[field]:'unknown'},f.grounding,'draft.ontology.entities[0].support'),(error:any)=>error.diagnostic.rule===rule);});
test('model-authored or fabricated quotation fields are rejected, never silently normalised',()=>{
 const f=plannerFixture(),support=f.draft.ontology.entities[0].support!;for(const quote of [support.quote,'Fabricated text.'])assert.throws(()=>resolvePassageSelection({...support,quote},f.grounding,'draft.ontology.entities[0].support'),(e:any)=>e.diagnostic.rule==='plan.unexpected_property');assert.equal(resolvePassageSelection(null,f.grounding,'draft.ontology.entities[0].support'),null);
});
test('relationship selection attaches only retrieved bytes; lack of support remains valid',()=>{const f=plannerFixture(),s=f.draft.ontology.entities[0].support!,result:any=expandRelationshipSelections({relationships:[{support:{sourceId:s.sourceId,passageId:s.passageId}},{support:null}]},f.grounding);assert.equal(result.relationships[0].support.quote,s.quote);assert.equal(result.relationships[1].support,null);assert.deepEqual(passageSelectionSchema().anyOf,[{type:'null'}]);});
